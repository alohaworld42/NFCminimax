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
        const { bridgeIp, username, actionType, actionParams, deviceId } = await req.json();

        if (!bridgeIp || !username || !actionType) {
            throw new Error('Missing required parameters: bridgeIp, username, actionType');
        }

        let endpoint = '';
        let method = 'PUT';
        let body: any = {};

        // Build the API endpoint and body based on action type
        switch (actionType) {
            case 'light_on':
                endpoint = `/api/${username}/lights/${deviceId}/state`;
                body = { on: true, ...actionParams };
                break;
            case 'light_off':
                endpoint = `/api/${username}/lights/${deviceId}/state`;
                body = { on: false };
                break;
            case 'set_brightness':
                endpoint = `/api/${username}/lights/${deviceId}/state`;
                body = { bri: actionParams.brightness || 254 };
                break;
            case 'set_color':
                endpoint = `/api/${username}/lights/${deviceId}/state`;
                body = { 
                    hue: actionParams.hue || 0, 
                    sat: actionParams.saturation || 254,
                    bri: actionParams.brightness || 254
                };
                break;
            case 'set_color_temp':
                endpoint = `/api/${username}/lights/${deviceId}/state`;
                body = { ct: actionParams.colorTemp || 200 };
                break;
            case 'activate_scene':
                endpoint = `/api/${username}/groups/${actionParams.groupId || 0}/action`;
                body = { scene: actionParams.sceneId };
                break;
            case 'group_on':
                endpoint = `/api/${username}/groups/${deviceId}/action`;
                body = { on: true, ...actionParams };
                break;
            case 'group_off':
                endpoint = `/api/${username}/groups/${deviceId}/action`;
                body = { on: false };
                break;
            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }

        // Execute the Hue API call
        const hueUrl = `http://${bridgeIp}${endpoint}`;
        console.log(`Calling Hue API: ${hueUrl}`);

        const response = await fetch(hueUrl, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hue API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        // Check for Hue API errors in response
        if (Array.isArray(result) && result[0]?.error) {
            throw new Error(`Hue API error: ${JSON.stringify(result[0].error)}`);
        }

        return new Response(JSON.stringify({
            success: true,
            data: result
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Hue action error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'HUE_ACTION_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
