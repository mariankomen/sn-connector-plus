(function process(request, response) {
    response.setContentType('application/json');
    const writer = response.getStreamWriter();

    function safeJsonParse(s) {
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    function getParam(name) {
        try {
            if (request && request.queryParams) {
                if (request.queryParams[name] !== undefined && request.queryParams[name] !== null && request.queryParams[name] !== '') {
                    return '' + request.queryParams[name];
                }
            }
            if (request && typeof request.getParameter === 'function') {
                const v2 = request.getParameter(name);
                if (v2 !== null && v2 !== undefined && v2 !== '') return '' + v2;
            }
        } catch (e) { }
        return null;
    }

    try {
        var uri = getParam('uri');
        
        if (!uri) {
            response.setStatus(400);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Missing required parameter: uri'
            }));
            return;
        }

        
        const connectionService = new x_1955226_peeklo_1.SalesforceConnectionService();
        const lookup = connectionService.getCurrentUserConnection();
        if (!lookup || !lookup.success) {
            response.setStatus(401);
            writer.writeString(JSON.stringify({
                success: false,
                error: (lookup && lookup.error) ? lookup.error : 'No active connection found'
            }));
            return;
        }

        const details = connectionService.getConnectionDetails(lookup.connection_id);
        if (!details || !details.success || !details.connection) {
            response.setStatus(401);
            writer.writeString(JSON.stringify({
                success: false,
                error: (details && details.error) ? details.error : 'Connection details not found'
            }));
            return;
        }

        const connection = details.connection;
        if (!connection.instance_url) {
            response.setStatus(400);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Salesforce instance_url is missing on the connection'
            }));
            return;
        }

        const oauthService = new x_1955226_peeklo_1.SalesforceOAuthService();
        const accessToken = oauthService.ensureValidAccessToken({
            connection: connection,
            connectionService: connectionService
        });
        
        if (!accessToken) {
            response.setStatus(401);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Unable to obtain Salesforce access token (re-authorize the connection)'
            }));
            return;
        }

        var instanceUrl = connection.instance_url.replace(/\/+$/, '');

        var endpoint = instanceUrl + '/services/data/v56.0/ui-api/lookups' + uri;
        
        var restMessage = new sn_ws.RESTMessageV2();
        restMessage.setEndpoint(endpoint);
        restMessage.setHttpMethod('GET');
        restMessage.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        restMessage.setRequestHeader('Accept', 'application/json');

        var restResponse = restMessage.execute();
        var httpStatus = restResponse.getStatusCode();
        var responseBody = restResponse.getBody();

        if (httpStatus >= 200 && httpStatus < 300) {
            var lookupData = safeJsonParse(responseBody);
            
            if (!lookupData) {
                response.setStatus(500);
                writer.writeString(JSON.stringify({
                    success: false,
                    error: 'Failed to parse Salesforce response'
                }));
                return;
            }

            response.setStatus(200);
            writer.writeString(JSON.stringify({
                success: true,
                data: lookupData,
                lookupResults: lookupData.lookupResults || {},
                metadata: lookupData.metadata || {}
            }));

        } else {
            var errorData = safeJsonParse(responseBody);
            if (!errorData) {
                errorData = { error: responseBody };
            }

            gs.error('Salesforce lookup API failed. Status=' + httpStatus + ' Body=' + responseBody);
            response.setStatus(httpStatus);
            writer.writeString(JSON.stringify({
                success: false,
                error: errorData.message || errorData[0]?.message || errorData.error || 'Salesforce API error',
                details: errorData
            }));
        }

    } catch (err) {
        gs.error('Error in Salesforce lookup suggestions handler: ' + err.message + '\nStack: ' + err.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + (err.message || String(err))
        }));
    }
})(request, response);

