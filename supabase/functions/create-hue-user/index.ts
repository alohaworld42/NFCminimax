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
        const { bridgeIp, devicetype } = await req.json();
        
        if (!bridgeIp) {
            throw new Error('Bridge IP is required');
        }

        // Philips Hue Bridge User Creation API
        const response = await fetch(`http://${bridgeIp}/api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                devicetype: devicetype || 'nfc-smart-home-app'
            })
        });

        const result = await response.json();

        // Check for specific Hue API error codes
        if (result && Array.isArray(result)) {
            const successResponse = result.find(r => r.success);
            const errorResponse = result.find(r => r.error);
            
            if (errorResponse) {
                return new Response(JSON.stringify({
                    success: false,
                    error: {
                        code: errorResponse.error.type,
                        message: errorResponse.error.description || 'Link button not pressed'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            if (successResponse) {
                return new Response(JSON.stringify({
                    success: true,
                    data: { username: successResponse.success.username }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

        throw new Error('Unexpected response format');

    } catch (error) {
        const errorResponse = {
            success: false,
            error: {
                code: 'AUTHENTICATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});