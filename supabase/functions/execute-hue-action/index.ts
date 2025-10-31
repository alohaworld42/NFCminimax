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
        const { bridgeIp, username, actionType, actionParams, deviceId } = await req.json();
        
        if (!bridgeIp || !username || !actionType) {
            throw new Error('Bridge IP, username, and action type are required');
        }

        const apiUrl = `http://${bridgeIp}/api/${username}`;
        let endpoint = '';
        let body = {};

        // Build Hue API call based on action type
        switch (actionType) {
            case 'light_on':
                endpoint = `/lights/${deviceId || '1'}/state`;
                body = { on: true };
                if (actionParams.brightness) {
                    body.bri = actionParams.brightness;
                }
                break;
            case 'light_off':
                endpoint = `/lights/${deviceId || '1'}/state`;
                body = { on: false };
                break;
            case 'set_brightness':
                endpoint = `/lights/${deviceId || '1'}/state`;
                body = { 
                    on: true,
                    bri: actionParams.brightness || 254
                };
                break;
            case 'set_color':
                endpoint = `/lights/${deviceId || '1'}/state`;
                body = {
                    on: true,
                    hue: actionParams.hue || 0,
                    sat: actionParams.saturation || 254,
                    bri: actionParams.brightness || 254
                };
                break;
            case 'set_color_temp':
                endpoint = `/lights/${deviceId || '1'}/state`;
                body = {
                    on: true,
                    ct: actionParams.colorTemp || 200
                };
                break;
            case 'activate_scene':
                endpoint = `/groups/${actionParams.groupId || '0'}/action`;
                body = {
                    scene: actionParams.sceneId
                };
                break;
            case 'group_on':
                endpoint = `/groups/${actionParams.groupId || '0'}/action`;
                body = {
                    on: true,
                    bri: actionParams.brightness || 254
                };
                break;
            case 'group_off':
                endpoint = `/groups/${actionParams.groupId || '0'}/action`;
                body = { on: false };
                break;
            default:
                throw new Error(`Unsupported action type: ${actionType}`);
        }

        const response = await fetch(`${apiUrl}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Hue API call failed: ${response.status}`);
        }

        const result = await response.json();

        return new Response(JSON.stringify({
            success: true,
            data: {
                action: actionType,
                result: result,
                endpoint: endpoint,
                body: body
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const errorResponse = {
            success: false,
            error: {
                code: 'HUE_ACTION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});