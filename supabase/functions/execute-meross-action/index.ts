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
        const { email, password, deviceUuid, actionType, region } = await req.json();
        
        if (!email || !password || !actionType) {
            throw new Error('Email, password, and action type are required');
        }

        // Meross API requires authentication to get user token
        const timestamp = Date.now();
        const nonce = Math.random().toString(36).substring(2, 15);
        
        // First, authenticate with Meross
        const authResponse = await fetch('https://m-api.meross.com/v1/Auth/Login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
                sign: this.createMD5Hash(timestamp + email + password + nonce)
            })
        });

        const authResult = await authResponse.json();
        
        if (!authResult.apiToken) {
            throw new Error('Meross authentication failed');
        }

        const apiToken = authResult.apiToken;

        // Now control the device
        const deviceAction = actionType === 'turn_on' ? 1 : 0;
        
        const controlResponse = await fetch(`https://m-api.meross.com/v1/Device/Control`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(apiToken + ':')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: authResult.userId,
                timestamp: timestamp,
                nonce: nonce,
                data: {
                    deviceId: deviceUuid || 'mock-device-id',
                    action: 'Switch'
                }
            })
        });

        const controlResult = await controlResponse.json();

        return new Response(JSON.stringify({
            success: true,
            data: {
                action: actionType,
                deviceUuid: deviceUuid,
                result: controlResult,
                authenticated: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const errorResponse = {
            success: false,
            error: {
                code: 'MEROSS_ACTION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Helper function to create MD5 hash (simplified for demo)
function createMD5Hash(str) {
    // In a real implementation, you'd use a proper MD5 library
    // For demo purposes, returning a mock hash
    return "mock_md5_hash_" + str.substring(0, 10);
}