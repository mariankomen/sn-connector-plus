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
        const objectName = getParam('object_name') || getParam('objectName');
        
        if (!objectName) {
            response.setStatus(400);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Missing required parameter: object_name'
            }));
            return;
        }

        
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

        var instanceUrl = connection.instance_url.replace(/\/+$/, '');

        var endpoint = instanceUrl + '/services/data/v56.0/sobjects/' + objectName + '/describe';
        var restMessage = new sn_ws.RESTMessageV2();
        restMessage.setEndpoint(endpoint);
        restMessage.setHttpMethod('GET');
        restMessage.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        restMessage.setRequestHeader('Accept', 'application/json');

        var restResponse = restMessage.execute();
        var httpStatus = restResponse.getStatusCode();
        var responseBody = restResponse.getBody();

        if (httpStatus >= 200 && httpStatus < 300) {
            var describeData = safeJsonParse(responseBody);
            
            if (!describeData) {
                response.setStatus(500);
                writer.writeString(JSON.stringify({
                    success: false,
                    error: 'Failed to parse Salesforce response'
                }));
                return;
            }

            var filterableFields = [];
            
            if (describeData.fields && Array.isArray(describeData.fields)) {
                for (var i = 0; i < describeData.fields.length; i++) {
                    var field = describeData.fields[i];
                    
                    
                    if (!field.filterable) {
                        continue;
                    }

                    var fieldData = {
                        name: field.name,
                        label: field.label,
                        type: field.type,
                        filterable: field.filterable,
                        picklistValues: []
                    };

                    
                    if (field.name === 'RecordTypeId' && describeData.recordTypeInfos) {
                        for (var rt = 0; rt < describeData.recordTypeInfos.length; rt++) {
                            var recordType = describeData.recordTypeInfos[rt];
                            if (recordType.master === false) {
                                fieldData.picklistValues.push({
                                    label: recordType.name,
                                    value: recordType.recordTypeId
                                });
                            }
                        }
                    }
                    
                    else if (field.type === 'boolean') {
                        fieldData.picklistValues.push({ label: 'TRUE', value: true });
                        fieldData.picklistValues.push({ label: 'FALSE', value: false });
                    }
                    
                    else if (field.picklistValues && Array.isArray(field.picklistValues) && field.picklistValues.length > 0) {
                        for (var p = 0; p < field.picklistValues.length; p++) {
                            var picklistValue = field.picklistValues[p];
                            fieldData.picklistValues.push({
                                label: picklistValue.label || picklistValue.value,
                                value: picklistValue.value
                            });
                        }
                    }

                    
                    if (fieldData.picklistValues.length > 0) {
                        filterableFields.push(fieldData);
                    }
                }
            }

            response.setStatus(200);
            writer.writeString(JSON.stringify({
                success: true,
                objectName: objectName,
                objectLabel: describeData.label || objectName,
                fields: filterableFields,
                recordTypeInfos: describeData.recordTypeInfos || []
            }));

        } else {
            var errorData = safeJsonParse(responseBody);
            if (!errorData) {
                errorData = { error: responseBody };
            }

            gs.error('Salesforce describe failed. Status=' + httpStatus + ' Body=' + responseBody);
            response.setStatus(httpStatus);
            writer.writeString(JSON.stringify({
                success: false,
                error: errorData.message || errorData[0]?.message || errorData.error || 'Salesforce API error',
                details: errorData
            }));
        }

    } catch (err) {
        gs.error('Error in Salesforce object describe handler: ' + err.message + '\nStack: ' + err.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + (err.message || String(err))
        }));
    }
})(request, response);

