import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getRegionFromPrefix = (numero: string): { prefix: string; region: string } => {
  const prefixMap: Record<string, string> = {
    "331": "Île-de-France",
    "332": "Nord-Ouest",
    "333": "Nord-Est",
    "334": "Sud-Est",
    "335": "Sud-Ouest",
    "336": "Mobile",
    "337": "Mobile",
    "338": "Services",
    "339": "Services",
  };
  
  const prefix = numero.substring(0, 3);
  return {
    prefix,
    region: prefixMap[prefix] || "France"
  };
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT verification is handled by Supabase config (verify_jwt = true)
    // Additional validation: check Authorization header exists
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { csvData } = await req.json();
    
    if (!csvData || typeof csvData !== "string") {
      return new Response(
        JSON.stringify({ error: "CSV data is required and must be a string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate CSV size (max 5MB)
    if (csvData.length > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "CSV data too large (max 5MB)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parsing CSV data...");
    
    const lines = csvData.split("\n").slice(1); // Skip header
    const numbers: { numero: string; prefix: string; region: string; type: string; status: string }[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(";");
      const numero = parts[1]?.trim();
      
      if (numero && numero.length > 5) {
        const { prefix, region } = getRegionFromPrefix(numero);
        numbers.push({
          numero,
          prefix,
          region,
          type: "SDA",
          status: "available"
        });
      }
    }

    console.log(`Parsed ${numbers.length} numbers`);

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < numbers.length; i += batchSize) {
      const batch = numbers.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from("available_numbers")
        .upsert(batch, { onConflict: "numero", ignoreDuplicates: true });
      
      if (error) {
        console.error(`Batch error: ${error.message}`);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    console.log(`Import complete: ${inserted} inserted, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Import terminé: ${inserted} numéros importés`,
        total: numbers.length,
        inserted,
        errors
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
