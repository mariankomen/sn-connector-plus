(function process(request, response) {
    const body = request.body ? request.body.data : {};
    response.setContentType('application/json');
    const writer = response.getStreamWriter();
    const oauthService = new x_1955226_peeklo_1.SalesforceOAuthService();
    const connectionService = new x_1955226_peeklo_1.SalesforceConnectionService();
    
    try {
        const code = body.code;
        const connectionId = body.connectionId;
        const codeVerifier = body.codeVerifier;
        
        if (!code || !connectionId) {
            response.setStatus(400);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'code or connectionId is missing'
            }));
            return;
        }

        const connectionResult = connectionService.getConnectionById(connectionId);
        if (!connectionResult.success) {
            response.setStatus(404);
            writer.writeString(JSON.stringify({
                success: false,
                error: connectionResult.error || 'Connection not found'
            }));
            return;
        }

        const connection = connectionResult.connection;

        const tokenResult = oauthService.exchangeCodeForToken({
            code,
            codeVerifier,
            clientId: connection.client_id,
            clientSecret: connection.client_secret,
            redirectUri: connection.redirect_uri
        });
        if (!tokenResult.success) {
            response.setStatus(500);
            writer.writeString(JSON.stringify({
                success: false,
                error: tokenResult.error || 'Failed to exchange code for token'
            }));
            return;
        }

        const tokenData = tokenResult.token;
        const accessTokenExpiresAt = oauthService.calculateAccessTokenExpiresAt(tokenData.issued_at);

        const connectionData = {
            client_id: connection.client_id,
            client_secret: connection.client_secret,
            redirect_uri: connection.redirect_uri,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            salesforce_user_id: tokenData.id || null,
            access_token_expires_at: accessTokenExpiresAt,
            instance_url: tokenData.instance_url
        };

        const saveResult = connectionService.saveConnection(connectionData);
        if (!saveResult.success) {
            response.setStatus(500);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Failed to save connection: ' + (saveResult.error || 'Unknown error')
            }));
            return;
        }

        response.setStatus(200);
        writer.writeString(JSON.stringify({
            access_token: tokenData.access_token,
        }));
    } catch (error) {
        gs.error('Error in Salesforce auth POST handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + error.message
        }));
    }
    
})(request, response);
