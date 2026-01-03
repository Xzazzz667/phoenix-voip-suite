import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  numbers: {
    id: string;
    numero: string;
    prefix: string;
    region: string;
  }[];
  orderedBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { numbers, orderedBy }: OrderEmailRequest = await req.json();

    if (!numbers || numbers.length === 0) {
      return new Response(
        JSON.stringify({ error: "No numbers provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing order for ${numbers.length} numbers by ${orderedBy}`);

    // Initialize Supabase client with service role for updating numbers
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Update the status of ordered numbers
    const numberIds = numbers.map(n => n.id);
    const { error: updateError } = await supabaseAdmin
      .from("available_numbers")
      .update({ status: "ordered" })
      .in("id", numberIds);

    if (updateError) {
      console.error("Error updating number status:", updateError);
      throw new Error("Failed to update number status");
    }

    console.log(`Updated ${numbers.length} numbers to 'ordered' status`);

    // Format phone numbers for display
    const formatPhoneNumber = (numero: string): string => {
      if (numero.startsWith("33")) {
        const withPlus = "+" + numero;
        return withPlus.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5 $6");
      }
      return numero;
    };

    // Build the email HTML
    const numbersTableRows = numbers
      .map(
        (n) => `
        <tr>
          <td style="padding: 10px; border: 1px solid #e0e0e0; font-family: monospace;">${formatPhoneNumber(n.numero)}</td>
          <td style="padding: 10px; border: 1px solid #e0e0e0;">+${n.prefix}</td>
          <td style="padding: 10px; border: 1px solid #e0e0e0;">${n.region}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Nouvelle commande de numéros SDA</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🛒 Nouvelle commande de numéros</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="margin-bottom: 20px;">
              <strong>Commandé par :</strong> ${orderedBy}<br>
              <strong>Date :</strong> ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}<br>
              <strong>Nombre de numéros :</strong> ${numbers.length}
            </p>
            
            <h2 style="color: #667eea; font-size: 18px; margin-bottom: 15px;">Numéros commandés :</h2>
            
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 5px; overflow: hidden;">
              <thead>
                <tr style="background: #667eea; color: white;">
                  <th style="padding: 12px; text-align: left;">Numéro</th>
                  <th style="padding: 12px; text-align: left;">Préfixe</th>
                  <th style="padding: 12px; text-align: left;">Région</th>
                </tr>
              </thead>
              <tbody>
                ${numbersTableRows}
              </tbody>
            </table>
            
            <p style="margin-top: 20px; padding: 15px; background: #e8f4f8; border-radius: 5px; border-left: 4px solid #667eea;">
              ⚡ Ces numéros ont été réservés et retirés de la liste des numéros disponibles.
            </p>
          </div>
          
          <p style="text-align: center; color: #888; font-size: 12px; margin-top: 20px;">
            DVS Connect - Portail de gestion
          </p>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "DVS Connect <onboarding@resend.dev>",
      to: ["compta@dvsconnect.com"],
      subject: `Nouvelle commande de ${numbers.length} numéro(s) SDA`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Commande envoyée pour ${numbers.length} numéro(s)`,
        emailId: emailResponse.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
