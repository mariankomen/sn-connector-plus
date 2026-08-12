(function process(request, response) {
    response.setContentType('application/json');
    const writer = response.getStreamWriter();

    try {
        const connectionService = new x_peekl_salesfor_0.SalesforceConnectionService();
        const currentConnection = connectionService.getCurrentUserConnection();
        if (!currentConnection.success) {
            response.setStatus(404);
            writer.writeString(JSON.stringify({
                success: false,
                error: currentConnection.error || 'No active connection found'
            }));
            return;
        }

        const connectionResult = connectionService.getConnectionById(currentConnection.connection_id);
        if (!connectionResult.success) {
            response.setStatus(404);
            writer.writeString(JSON.stringify({
                success: false,
                error: connectionResult.error || 'Connection details not found'
            }));
            return;
        }

        const connection = connectionResult.connection || {};

        response.setStatus(200);
        writer.writeString(JSON.stringify({
            success: true,
            result: {
                instanceUrl: connection.instance_url || ''
            }
        }));
    } catch (error) {
        gs.error('Error in Salesforce connection GET handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + error.message
        }));
    }
})(request, response);


