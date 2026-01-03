import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yeti-token',
};

const YETI_API_BASE = 'https://sbc.dvsconnect.com/api/rest/customer/v1';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    
    const { endpoint, method = 'GET', data, auth } = body;
    
    console.log(`[Yeti API Proxy] ${method} ${endpoint}`);

    // Special case for authentication
    if (endpoint === '/auth') {
      console.log('[Yeti API Proxy] Authentication request');
      
      const authResponse = await fetch(`${YETI_API_BASE}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          auth: {
            login: auth?.username,
            password: auth?.password,
          }
        }),
      });

      const authData = await authResponse.json();
      
      console.log(`[Yeti API Proxy] Auth response status: ${authResponse.status}`);
      
      if (!authResponse.ok) {
        console.error('[Yeti API Proxy] Auth failed:', authData);
        return new Response(
          JSON.stringify({ error: 'Authentication failed', details: authData }),
          { 
            status: authResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify(authData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For all other API calls, require JWT token
    const yetiToken = req.headers.get('x-yeti-token');
    
    if (!yetiToken) {
      console.error('[Yeti API Proxy] No token provided');
      return new Response(
        JSON.stringify({ error: 'No authorization token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Proxy the request to Yeti API
    const yetiUrl = `${YETI_API_BASE}${endpoint}`;
    console.log(`[Yeti API Proxy] Calling: ${yetiUrl}`);

    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${yetiToken}`,
      },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(yetiUrl, fetchOptions);
    const responseData = await response.json().catch(() => null);

    console.log(`[Yeti API Proxy] Response status: ${response.status}`);

    return new Response(
      JSON.stringify(responseData),
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[Yeti API Proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
