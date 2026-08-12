(function process(request, response) {
    
    response.setContentType('application/json');
    
    try {
        var body = request.body;
        var data;
        var isBatch = false;
        
        const requestBody = body.data;
        if(!requestBody || !requestBody.sys_id){
            response.setBody({
                success: false,
                body: body.data,
                error: 'No valid data provided. Expected object with key sys_id.'
            });
            return;
        }
        const linkId = requestBody.sys_id;

        const connectionService = new x_peekl_salesfor_0.SalesforceConnectionService();
        const lookup = connectionService.getCurrentUserConnection();

        if (!lookup || !lookup.success) {
            response.setStatus(401);
            response.setBody({
                success: false,
                error: (lookup && lookup.error) ? lookup.error : 'No active connection found'
            });
            return;
        }

        const details = connectionService.getConnectionDetails(lookup.connection_id);
        if (!details || !details.success || !details.connection) {
            response.setStatus(401);
            response.setBody({
                success: false,
                error: (lookup && lookup.error) ? lookup.error : 'Connection details not found'
            });
            return;
        }

        const connection = details.connection;
        if (!connection.instance_url) {
            response.setStatus(401);
            response.setBody({
                success: false,
                error: 'Salesforce instance_url is missing on the connection'
            });
            return;
        }

        
        const oauthService = new x_peekl_salesfor_0.SalesforceOAuthService();
        const accessToken = oauthService.ensureValidAccessToken({
            connection: connection,
            connectionService: connectionService,
        });

        if (!accessToken) {
            response.setStatus(401);
            response.setBody({
                success: false,
                error: 'Unable to obtain Salesforce access token (re-authorize the connection)'
            });
            return;
        }
        const sobjectName = 'pl_servicenow__Peeklogic_Object_Connect__c';
        const instanceUrl = (connection.instance_url || '').replace(/\/+$/, '');
        const endpoint = `${instanceUrl}/services/data/v60.0/sobjects/${sobjectName}/${linkId}`;

        var deleteRequest = new sn_ws.RESTMessageV2();
        deleteRequest.setEndpoint(endpoint);
        deleteRequest.setHttpMethod('DELETE');
        deleteRequest.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        deleteRequest.setRequestHeader('Accept', 'application/json');

        let deleteResponse, deleteStatus, deleteBody;

        deleteResponse = deleteRequest.execute();
        deleteStatus = deleteResponse.getStatusCode();
        deleteBody = deleteResponse.getBody();
        let results = [];

        if (deleteStatus === 204) {
            gs.info(`Record ${linkId} deleted successfully`);
        } else {
            deleteBody = JSON.parse(deleteBody);
            results = deleteBody.map(el => {
                return {
                    recordId: linkId,
                    message: el?.message || 'Undefined error'
                }
            })
        }
        const isSuccess = deleteStatus === 204;
        response.setStatus(200);
        response.setBody({
            success: isSuccess,
            total: 1,
            succeeded: isSuccess ? 1 : 0,
            failed: isSuccess ? 0 : 1,
            message: isSuccess ? 'Record link deleted successfully' : 'Record link delete failed.',
            results: results
        });
    } catch (err) {
        response.setStatus(500);
        response.setBody({
            success: false,
            error: err.message || String(err)
        });
    }
})(request, response);

