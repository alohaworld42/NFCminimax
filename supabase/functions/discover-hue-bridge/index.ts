Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Use the Philips discovery broker service
        const discoveryUrl = 'https://discovery.meethue.com/';
        
        console.log('Discovering Hue bridges via broker...');
        
        const response = await fetch(discoveryUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Discovery failed: ${response.status}`);
        }

        const bridges = await response.json();
        
        if (!Array.isArray(bridges) || bridges.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                data: {
                    bridges: [],
                    message: 'No Hue bridges found on the network'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Return discovered bridges with their IP addresses
        return new Response(JSON.stringify({
            success: true,
            data: {
                bridges: bridges.map(bridge => ({
                    id: bridge.id,
                    internalipaddress: bridge.internalipaddress,
                    port: bridge.port || 80
                }))
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Bridge discovery error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'DISCOVERY_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
