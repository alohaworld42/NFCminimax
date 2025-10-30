Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { bridgeIp, devicetype } = await req.json();

        if (!bridgeIp) {
            throw new Error('Bridge IP address is required');
        }

        const deviceName = devicetype || 'nfc-smart-home-app#capacitor';

        // Create user on the bridge (link button must be pressed first)
        const url = `http://${bridgeIp}/api`;
        
        console.log(`Creating user on bridge: ${bridgeIp}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                devicetype: deviceName
            })
        });

        if (!response.ok) {
            throw new Error(`Bridge authentication failed: ${response.status}`);
        }

        const result = await response.json();
        
        // Check for errors in response
        if (Array.isArray(result) && result[0]?.error) {
            const error = result[0].error;
            
            if (error.type === 101) {
                return new Response(JSON.stringify({
                    error: {
                        code: 'LINK_BUTTON_NOT_PRESSED',
                        message: 'Please press the link button on the Hue Bridge and try again'
                    }
                }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
            
            throw new Error(`Bridge error: ${error.description}`);
        }

        // Success - extract username
        if (Array.isArray(result) && result[0]?.success?.username) {
            const username = result[0].success.username;
            
            return new Response(JSON.stringify({
                success: true,
                data: {
                    username,
                    bridgeIp,
                    message: 'Successfully authenticated with Hue Bridge'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error('Unexpected response format from bridge');

    } catch (error) {
        console.error('Hue user creation error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'USER_CREATION_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
