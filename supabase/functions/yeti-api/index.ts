import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yeti-token',
};

const YETI_API_BASE = 'https://sbc.dvsconnect.com/api/rest/customer/v1';

// Rate limiting: simple in-memory store (resets on function restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting based on IP
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    
    const { endpoint, method = 'GET', data, auth, params } = body;

    // Validate endpoint format to prevent injection
    // Allow path segments only (query params should be passed in 'params' object)
    const endpointPath = endpoint?.split('?')[0] || '';
    const queryString = endpoint?.includes('?') ? endpoint.split('?')[1] : '';
    
    if (!endpoint || typeof endpoint !== "string" || !/^\/[a-zA-Z0-9/_-]*/.test(endpointPath)) {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate method
    const allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    if (!allowedMethods.includes(method.toUpperCase())) {
      return new Response(
        JSON.stringify({ error: "Invalid HTTP method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[Yeti API Proxy] ${method} ${endpoint}`);

    // Special case for authentication
    if (endpoint === '/auth') {
      console.log('[Yeti API Proxy] Authentication request');
      
      // Validate auth credentials are provided
      if (!auth?.username || !auth?.password) {
        return new Response(
          JSON.stringify({ error: 'Username and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const authResponse = await fetch(`${YETI_API_BASE}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          auth: {
            login: auth.username,
            password: auth.password,
          }
        }),
      });

      const authData = await authResponse.json();
      
      console.log(`[Yeti API Proxy] Auth response status: ${authResponse.status}`);
      
      if (!authResponse.ok) {
        console.error('[Yeti API Proxy] Auth failed');
        return new Response(
          JSON.stringify({ error: 'Authentication failed' }),
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
    // Build URL with query params if present
    let yetiUrl = `${YETI_API_BASE}${endpointPath}`;
    if (queryString) {
      yetiUrl += `?${queryString}`;
    }
    console.log(`[Yeti API Proxy] Calling: ${yetiUrl}`);

    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'Authorization': `Bearer ${yetiToken}`,
      },
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(yetiUrl, fetchOptions);
    const responseData = await response.json().catch(() => null);

    console.log(`[Yeti API Proxy] Response status: ${response.status}`);

    // Pour les erreurs 403/404, on retourne un statut 200 avec les données d'erreur
    // Cela permet au frontend de gérer l'erreur gracieusement sans écran blanc
    if (response.status === 403 || response.status === 404) {
      console.log(`[Yeti API Proxy] Permission denied or not found for ${endpoint}`);
      return new Response(
        JSON.stringify({ 
          data: null, 
          error: response.status === 403 ? 'Permission denied' : 'Not found',
          status: response.status 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
