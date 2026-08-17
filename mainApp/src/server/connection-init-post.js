(function process(request, response) {
    const body = request.body ? request.body.data : {};
    const writer = response.getStreamWriter();
    response.setContentType('application/json');

    const clientId = body.clientId;
    const clientSecret = body.clientSecret;
    const redirectUri = body.redirectUri;
    if (!clientId || !clientSecret || !redirectUri) {
        response.setStatus(400);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'clientId, clientSecret and redirectUri are required'
        }));
        return;
    }

    try {
        const connectionService = new x_1955226_peeklo_1.SalesforceConnectionService();
        const result = connectionService.saveConnection({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri
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

