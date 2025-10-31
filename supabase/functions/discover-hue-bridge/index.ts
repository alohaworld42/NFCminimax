Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Philips Hue Bridge Discovery via Meethue.com
        const response = await fetch('https://discovery.meethue.com/');
        
        if (!response.ok) {
            throw new Error(`Discovery failed: ${response.status}`);
        }

        const bridges = await response.json();
        
        return new Response(JSON.stringify({ 
            success: true, 
            data: { bridges: bridges || [] }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const errorResponse = {
            success: false,
            error: {
                code: 'DISCOVERY_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});