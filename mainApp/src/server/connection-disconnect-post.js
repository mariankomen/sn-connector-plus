(function process(request, response) {
    response.setContentType('application/json');
    const writer = response.getStreamWriter();

    try {
        const connectionService = new x_1955226_peeklo_1.SalesforceConnectionService();
        const result = connectionService.disconnectCurrentUserConnection();

        if (!result.success) {
            response.setStatus(404);
            writer.writeString(JSON.stringify({
                success: false,
                error: result.error || 'No connection to disconnect'
            }));
            return;
        }

        response.setStatus(200);
        writer.writeString(JSON.stringify({
            success: true,
            connectionId: result.connection_id
        }));
    } catch (error) {
        gs.error('Error in Salesforce connection disconnect handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + error.message
        }));
    }
})(request, response);


