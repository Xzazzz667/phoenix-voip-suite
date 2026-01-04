import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YETI_ADMIN_API_BASE = 'https://switch.dvsconnect.com/api/rest/admin';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { endpoint, method = 'GET' } = body;

    // Validate endpoint format
    if (!endpoint || typeof endpoint !== "string" || !/^\/[a-zA-Z0-9/_-]*/.test(endpoint)) {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const username = Deno.env.get('YETI_ADMIN_USER');
    const password = Deno.env.get('YETI_ADMIN_PASSWORD');

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Admin credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Yeti Admin API] ${method} ${endpoint}`);

    // Use Basic Auth
    const basicAuth = btoa(`${username}:${password}`);
    
    const yetiUrl = `${YETI_ADMIN_API_BASE}${endpoint}`;
    console.log(`[Yeti Admin API] Calling: ${yetiUrl}`);

    const response = await fetch(yetiUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    const responseText = await response.text();
    console.log(`[Yeti Admin API] Response status: ${response.status}`);
    console.log(`[Yeti Admin API] Response body: ${responseText.substring(0, 500)}`);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[Yeti Admin API] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
