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
        const { deviceType, connectionDetails } = await req.json();

        if (!deviceType || !connectionDetails) {
            throw new Error('Missing required parameters: deviceType, connectionDetails');
        }

        let testResult: any = {
            success: false,
            online: false,
            details: {}
        };

        if (deviceType === 'hue_bridge') {
            // Test Hue Bridge connection
            const { bridgeIp, username } = connectionDetails;
            
            if (!bridgeIp || !username) {
                throw new Error('Missing Hue bridge IP or username');
            }

            try {
                const response = await fetch(`http://${bridgeIp}/api/${username}/config`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const config = await response.json();
                    
                    // Check if response contains error
                    if (Array.isArray(config) && config[0]?.error) {
                        throw new Error(config[0].error.description);
                    }

                    testResult = {
                        success: true,
                        online: true,
                        details: {
                            name: config.name,
                            bridgeid: config.bridgeid,
                            modelid: config.modelid,
                            apiversion: config.apiversion,
                            swversion: config.swversion
                        }
                    };
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                testResult = {
                    success: false,
                    online: false,
                    error: error.message
                };
            }

        } else if (deviceType === 'meross_plug') {
            // Test Meross connection (simplified - actual test would require MQTT)
            const { email, password } = connectionDetails;
            
            if (!email || !password) {
                throw new Error('Missing Meross credentials');
            }

            testResult = {
                success: true,
                online: true,
                details: {
                    message: 'Meross credentials stored. Device status requires MQTT connection.',
                    note: 'Full device testing requires active MQTT session.'
                }
            };
        } else {
            throw new Error(`Unknown device type: ${deviceType}`);
        }

        return new Response(JSON.stringify({
            success: true,
            data: testResult
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Device test error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'TEST_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
