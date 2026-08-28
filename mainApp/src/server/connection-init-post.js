(function process(request, response) {
    const body = request.body ? request.body.data : {};
    const writer = response.getStreamWriter();
    response.setContentType('application/json');

    const ALLOWED_LOGIN_URLS = ['https://login.salesforce.com', 'https://test.salesforce.com'];

    const clientId = body.clientId;
    const clientSecret = body.clientSecret;
    const redirectUri = body.redirectUri;
    const loginUrl = body.loginUrl || ALLOWED_LOGIN_URLS[0];
    if (!clientId || !clientSecret || !redirectUri) {
        response.setStatus(400);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'clientId, clientSecret and redirectUri are required'
        }));
        return;
    }
    if (ALLOWED_LOGIN_URLS.indexOf(loginUrl) === -1) {
        response.setStatus(400);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'loginUrl must be one of: ' + ALLOWED_LOGIN_URLS.join(', ')
        }));
        return;
    }

    try {
        const connectionService = new x_1955226_peeklo_1.SalesforceConnectionService();
        const result = connectionService.saveConnection({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            login_url: loginUrl
        });
        if (!result.success) {
            response.setStatus(500);
            writer.writeString(JSON.stringify({
                success: false,
                error: result.error || 'Failed to initialize connection'
            }));
            return;
        }

        response.setStatus(200);
        writer.writeString(JSON.stringify({
            success: true,
            connectionId: result.connection_id
        }));
    } catch (error) {
        gs.error('Error in Salesforce connection init handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + error.message
        }));
    }
})(request, response);

