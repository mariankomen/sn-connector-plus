(function process(request, response) {
    response.setContentType('application/json');
    const writer = response.getStreamWriter();

    try {
        const connectionService = new x_peekl_salesfor_0.SalesforceConnectionService();
        const lookup = connectionService.getCurrentUserConnection();
        if (!lookup || !lookup.success) {
            response.setStatus(200);
            writer.writeString(JSON.stringify({
                isValid: false
            }));
            return;
        }

        const details = connectionService.getConnectionDetails(lookup.connection_id);
        if (!details || !details.success || !details.connection) {
            response.setStatus(200);
            writer.writeString(JSON.stringify({
                isValid: false
            }));
            return;
        }

        const conn = details.connection;
        const hasToken = !!conn.access_token;

        response.setStatus(200);
        writer.writeString(JSON.stringify({
            isValid: hasToken,
            connectionId: lookup.connection_id
        }));
    } catch (error) {
        gs.error('Error in Salesforce connection status handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            error: 'Internal server error: ' + error.message
        }));
    }
})(request, response);


