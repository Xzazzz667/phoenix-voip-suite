import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YETI_ADMIN_API_BASE = 'https://sbc.dvsconnect.com/api/rest/admin';

// In-memory token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAdminToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    console.log('[Yeti Admin API] Using cached token');
    return cachedToken.token;
  }

  const username = Deno.env.get('YETI_ADMIN_USER');
  const password = Deno.env.get('YETI_ADMIN_PASSWORD');

  if (!username || !password) {
    throw new Error('Admin credentials not configured');
  }

  console.log('[Yeti Admin API] Fetching new token...');
  
  const authResponse = await fetch(`${YETI_ADMIN_API_BASE}/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      auth: {
        login: username,
        password: password,
      }
    }),
  });

  if (!authResponse.ok) {
    const errorText = await authResponse.text();
    console.error('[Yeti Admin API] Auth failed:', errorText);
    throw new Error(`Authentication failed: ${authResponse.status}`);
  }

  const authData = await authResponse.json();
  const token = authData?.data?.attributes?.jwt;
  
  if (!token) {
    throw new Error('No JWT token in response');
  }

  // Cache token for 1 hour (typical JWT validity)
  cachedToken = {
    token,
    expiresAt: now + 60 * 60 * 1000,
  };

  console.log('[Yeti Admin API] Token obtained successfully');
  return token;
}

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

    console.log(`[Yeti Admin API] ${method} ${endpoint}`);

    // Get admin token (cached or fresh)
    const token = await getAdminToken();

    // Proxy the request to Yeti Admin API
    const yetiUrl = `${YETI_ADMIN_API_BASE}${endpoint}`;
    console.log(`[Yeti Admin API] Calling: ${yetiUrl}`);

    const response = await fetch(yetiUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const responseData = await response.json().catch(() => null);
    console.log(`[Yeti Admin API] Response status: ${response.status}`);

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
