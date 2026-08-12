(function process(request, response) {
    response.setContentType('application/json');
    const writer = response.getStreamWriter();

    function safeJsonParse(s) {
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    try {
        const connectionService = new x_peekl_salesfor_0.SalesforceConnectionService();
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

        const oauthService = new x_peekl_salesfor_0.SalesforceOAuthService();
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

        const endpoint =
            connection.instance_url.replace(/\/+$/, '') +
            '/services/data/v56.0/sobjects';

        const req = new sn_ws.RESTMessageV2();
        req.setEndpoint(endpoint);
        req.setHttpMethod('GET');
        req.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        req.setRequestHeader('Accept', 'application/json');

        const res = req.execute();
        const status = res.getStatusCode();
        const body = res.getBody() || '';
        const parsed = safeJsonParse(body);

        if (status < 200 || status >= 300) {
            gs.error('Salesforce sobjects list failed. Status=' + status + ' Body=' + body);
            response.setStatus(status);
            writer.writeString(JSON.stringify({
                success: false,
                status: status,
                error: 'Salesforce sobjects request failed',
                salesforce: parsed || body
            }));
            return;
        }

        var allSobjects = parsed && parsed.sobjects ? parsed.sobjects : [];
        var filteredSobjects = allSobjects.filter(function(obj) {
            return obj.customSetting === false && 
                   obj.queryable === true && 
                   obj.layoutable === true;
        });
        
        response.setStatus(200);
        writer.writeString(JSON.stringify({
            success: true,
            status: status,
            endpoint: endpoint,
            result: parsed || body,
            sobjects: filteredSobjects,
            total: allSobjects.length,
            filtered: filteredSobjects.length
        }));
    } catch (error) {
        gs.error('Error in Salesforce sobjects GET handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + error.message
        }));
    }
})(request, response);


