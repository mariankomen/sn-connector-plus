(function process(request, response) {
    response.setContentType('application/json');
    try{
        var body = request.body;

        function safeJsonParse(s) {
            try {
                return JSON.parse(s);
            } catch (e) {
                return null;
            }
        }

        if(!body) {
            response.setStatus(400);
            response.setBody({
                success: false,
                error: 'Request body is empty or null',
                debug: {
                    body_type: typeof body,
                    body_value: String(body),
                    has_body: body !== null && body !== undefined
                }
            });
            return;
        }
            
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (parseErr) {
                response.setStatus(400);
                response.setBody({
                    success: false,
                    error: 'Invalid JSON in request body',
                    parse_error: parseErr.message,
                    body_string: body
                });
                return;
            }
        }
        body = body.data ?? {};
        
        if(!body.servicenow_table || !body.servicenow_sys_id || !body.sf_object_type || !body.sf_record_id){
            response.setStatus(400);
            const missedKeys = [];
            if(!body.servicenow_table) missedKeys.push('servicenow_table');
            if(!body.servicenow_sys_id) missedKeys.push('servicenow_sys_id');
            if(!body.sf_object_type) missedKeys.push('sf_object_type');
            if(!body.sf_record_id) missedKeys.push('sf_record_id');

            response.setBody({
                success: false,
                error: `Missing required object keys: [${missedKeys.join(', ')}]`,
                body_string: body
            });
            return;
        }

        const query = `SELECT Id FROM pl_servicenow__Peeklogic_Object_Connect__c
        WHERE Name = '${body.sf_record_id}'
        AND pl_servicenow__SN_Object_Id__c = '${body.servicenow_sys_id}'
        AND pl_servicenow__SN_Object_Name__c = '${body.servicenow_table.toLowerCase()}'
        `
        const connectionService = new x_1955226_peeklo_1.SalesforceConnectionService();
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

        
        const oauthService = new x_1955226_peeklo_1.SalesforceOAuthService();
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

        const instanceUrl = (connection.instance_url || '').replace(/\/+$/, '');
        const endpoint = `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(query)}`;

        var sfReq = new sn_ws.RESTMessageV2();
        sfReq.setEndpoint(endpoint);
        sfReq.setHttpMethod('GET');
        sfReq.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        sfReq.setRequestHeader('Accept', 'application/json');

        const req = sfReq.execute();
        const httpStatus = req.getStatusCode();
        const responseBody = req.getBody();
        const parsed = safeJsonParse(responseBody);
        if(parsed.totalSize > 0){
            response.setStatus(201);
            response.setBody({
                success: true,
                body: {
                    salesforceRecordId: parsed.records[0].Id
                }
            });
            return;
        }else{
            const payload = {
                "Name": body.sf_record_id,
                "pl_servicenow__SN_Object_Id__c": body.servicenow_sys_id,
                "pl_servicenow__SN_Object_Name__c": body.servicenow_table.toLowerCase(),
            }
            const endpointCreate = `${instanceUrl}/services/data/v60.0/sobjects/pl_servicenow__Peeklogic_Object_Connect__c/`;

            var sfCreateReq = new sn_ws.RESTMessageV2();
            sfCreateReq.setEndpoint(endpointCreate);
            sfCreateReq.setHttpMethod('POST');
            sfCreateReq.setRequestHeader('Authorization', 'Bearer ' + accessToken);
            sfCreateReq.setRequestHeader('Accept', 'application/json');
            sfCreateReq.setRequestHeader('Content-Type', 'application/json');
            sfCreateReq.setRequestBody(JSON.stringify(payload));

            const createReq = sfCreateReq.execute();
            const httpStatus = createReq.getStatusCode();
            const responseBody = createReq.getBody();
            const parsed = safeJsonParse(responseBody);

            response.setStatus(201);
            response.setBody({
                success: true,
                body: parsed.id
            });
            return;
        }
    }catch(err){
        response.setStatus(500);
        response.setBody({
            success: false,
            body: 'Internal server error: ' + err.message
        });
    }
    
})(request, response);