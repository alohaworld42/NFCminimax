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
        const { deviceType, connectionDetails } = await req.json();
        
        if (!deviceType) {
            throw new Error('Device type is required');
        }

        let online = false;
        let deviceInfo = {};

        if (deviceType === 'hue_bridge') {
            const { bridgeIp, username } = connectionDetails;
            
            if (!bridgeIp) {
                throw new Error('Bridge IP is required for Hue device');
            }

            try {
                // Test Hue bridge connection by getting lights
                const response = await fetch(`http://${bridgeIp}/api/${username || ''}/lights`);
                
                if (response.ok) {
                    const lights = await response.json();
                    online = true;
                    deviceInfo = {
                        bridgeIp,
                        lights: Object.keys(lights).length,
                        connected: true
                    };
                } else if (response.status === 401) {
                    // Bridge is online but needs authentication
                    deviceInfo = {
                        bridgeIp,
                        connected: true,
                        needsAuth: true,
                        message: 'Bridge found but needs authentication'
                    };
                }
            } catch (error) {
                deviceInfo = {
                    bridgeIp,
                    connected: false,
                    error: error.message
                };
            }

        } else if (deviceType === 'meross_plug') {
            const { email, deviceUuid } = connectionDetails;
            
            if (!email) {
                throw new Error('Email is required for Meross device');
            }

            try {
                // Test Meross connectivity (simplified check)
                const response = await fetch('https://m-api.meross.com/v1/Auth/Login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        password: 'test_password',
                        sign: 'test_sign'
                    })
                });

                // Even with wrong credentials, if we get a response, API is reachable
                if (response.ok || response.status === 400) {
                    online = true;
                    deviceInfo = {
                        email: email,
                        connected: true,
                        message: 'API reachable'
                    };
                }
            } catch (error) {
                deviceInfo = {
                    email: email,
                    connected: false,
                    error: error.message
                };
            }
        } else {
            throw new Error(`Unsupported device type: ${deviceType}`);
        }

        return new Response(JSON.stringify({
            success: true,
            data: {
                online: online,
                deviceInfo: deviceInfo,
                lastChecked: new Date().toISOString()
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const errorResponse = {
            success: false,
            error: {
                code: 'CONNECTION_TEST_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});