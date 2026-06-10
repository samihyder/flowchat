export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Visitor-Token, Authorization',
  };
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
