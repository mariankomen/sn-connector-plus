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

    function isSalesforceId(id) {
        return /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/.test(id);
    }

    function addViewUrlsToRecord(record, instanceUrl) {
        if (!record || typeof record !== 'object' || !instanceUrl) {
            return record;
        }

        var result = JSON.parse(JSON.stringify(record));

        for (var fieldName in record) {
            if (fieldName === 'attributes' || fieldName.endsWith('_url')) {
                continue;
            }

            var fieldValue = record[fieldName];
            
            if (!fieldValue || typeof fieldValue !== 'string') {
                continue;
            }

            
            var isIdField = (fieldName.endsWith('Id') || fieldName.endsWith('__c')) && 
                           isSalesforceId(fieldValue);
            
            if (isIdField) {
                
                var viewUrl = instanceUrl + '/' + fieldValue;
                result[fieldName + '_url'] = viewUrl;
            }
        }

        return result;
    }

    try {
        const servicenowSysId = getParam('servicenow_sys_id');
        const servicenowTable = getParam('servicenow_table');

        if (!servicenowSysId) {
            response.setStatus(400);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Missing required parameter: servicenow_sys_id'
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
        const query = `
            SELECT Id, pl_servicenow__SN_Object_Id__c, pl_servicenow__SN_Object_Name__c, Name FROM pl_servicenow__Peeklogic_Object_Connect__c
            WHERE pl_servicenow__SN_Object_Id__c ='${servicenowSysId}'
        `
        const salesforceObjectService = new x_peekl_salesfor_0.SalesforceObjectService();
        const linkedRecordsList = salesforceObjectService.query(query);
        const salesforceIds = linkedRecordsList.filter(el => el.Name != null).map(el => el.Name);
        const salesforceIdWithObjectType = salesforceObjectService.getObjectsOfRecordsList(salesforceIds);


        var linkedRecords = linkedRecordsList.map(el => {
            const salesforceRecordId = el.Name;
            return {
                sys_id: el.Id,
                servicenow_table: el.pl_servicenow__SN_Object_Name__c,
                servicenow_sys_id: el.pl_servicenow__SN_Object_Id__c,
                sf_object_type: salesforceIdWithObjectType[salesforceRecordId],
                sf_record_id: salesforceRecordId
            }
        })

        if (linkedRecords.length === 0) {
            response.setStatus(200);
            writer.writeString(JSON.stringify({
                success: true,
                links: [],
                records: []
            }));
            return;
        }
        
        var configGr = new GlideRecord('x_peekl_salesfor_0_salesforce_object_config');
        configGr.addQuery('active', true);
        configGr.query();
        
        var objectConfigs = {};
        var configSysIdToObjName = {};
        while (configGr.next()) {
            var objName = configGr.getValue('sf_object_name');
            var configSysId = configGr.getUniqueValue();
            configSysIdToObjName[configSysId] = objName;
            objectConfigs[objName] = {
                sys_id: configSysId,
                label: configGr.getValue('sf_object_label'),
                displayFields: [], 
                columns: [] 
            };
        }
        
        var columnsGr = new GlideRecord('x_peekl_salesfor_0_salesforce_object_columns');
        columnsGr.addQuery('active', true);
        columnsGr.orderBy('order');
        columnsGr.orderBy('column_name');
        columnsGr.query();
        
        while (columnsGr.next()) {
            var objectConfigSysId = columnsGr.getValue('object_config');
            var columnName = columnsGr.getValue('column_name');
            var columnLabel = columnsGr.getValue('column_label') || columnName;
            var columnOrder = parseInt(columnsGr.getValue('order')) || 100;
            
            var objName = configSysIdToObjName[objectConfigSysId];
            if (objName && objectConfigs[objName]) {
                if (objectConfigs[objName].displayFields.indexOf(columnName) === -1) {
                    objectConfigs[objName].displayFields.push(columnName);
                    objectConfigs[objName].columns.push({
                        name: columnName,
                        label: columnLabel,
                        order: columnOrder
                    });
                }
            }
        }
        
        var recordsWithData = [];
        for (var i = 0; i < linkedRecords.length; i++) {
            var link = linkedRecords[i];
            var sfObjectType = link.sf_object_type;
            var sfRecordId = link.sf_record_id;
            
            var config = objectConfigs[sfObjectType];
            if (!config || !config.displayFields || config.displayFields.length === 0) {
                continue;
            }
            
            var fieldsToFetch = config.displayFields;
            
            var fieldsList = [];
            
            if (fieldsList.indexOf('Id') === -1) {
                fieldsList.push('Id');
            }
            for (var f = 0; f < fieldsToFetch.length; f++) {
                if (fieldsList.indexOf(fieldsToFetch[f]) === -1) {
                    fieldsList.push(fieldsToFetch[f]);
                }
            }
            
            try {
                var endpoint = instanceUrl + '/services/data/v56.0/sobjects/' + sfObjectType + '/' + sfRecordId + '?fields=' + fieldsList.join(',');
                var req = new sn_ws.RESTMessageV2();
                req.setEndpoint(endpoint);
                req.setHttpMethod('GET');
                req.setRequestHeader('Authorization', 'Bearer ' + accessToken);
                req.setRequestHeader('Accept', 'application/json');
                
                var res = req.execute();
                var status = res.getStatusCode();
                var body = res.getBody() || '';
                var parsed = safeJsonParse(body);
                
                if (status >= 200 && status < 300 && parsed) {
                    var recordWithUrls = addViewUrlsToRecord(parsed, instanceUrl);
                    recordsWithData.push({
                        link: link,
                        record: recordWithUrls,
                        objectType: sfObjectType,
                        objectLabel: config ? config.label : sfObjectType,
                        displayFields: fieldsList,
                        columns: config ? config.columns : []
                    });
                } else if (status === 404) {
                    gs.warn('Salesforce record not found: ' + sfRecordId + ' (Status: ' + status + ', Body: ' + body.substring(0, 200) + ')');
                    recordsWithData.push({
                        link: link,
                        record: null,
                        error: 'Record not found in Salesforce',
                        objectType: sfObjectType,
                        objectLabel: config ? config.label : sfObjectType,
                        displayFields: fieldsList,
                        columns: config ? config.columns : []
                    });
                } else {
                    gs.warn('Failed to fetch Salesforce record with fields, trying without fields: ' + sfRecordId + ' (Status: ' + status + ')');
                    try {
                        var endpointBasic = instanceUrl + '/services/data/v56.0/sobjects/' + sfObjectType + '/' + sfRecordId;
                        var reqBasic = new sn_ws.RESTMessageV2();
                        reqBasic.setEndpoint(endpointBasic);
                        reqBasic.setHttpMethod('GET');
                        reqBasic.setRequestHeader('Authorization', 'Bearer ' + accessToken);
                        reqBasic.setRequestHeader('Accept', 'application/json');
                        
                        var resBasic = reqBasic.execute();
                        var statusBasic = resBasic.getStatusCode();
                        var bodyBasic = resBasic.getBody() || '';
                        var parsedBasic = safeJsonParse(bodyBasic);
                        
                        if (statusBasic >= 200 && statusBasic < 300 && parsedBasic) {
                            var recordWithUrlsBasic = addViewUrlsToRecord(parsedBasic, instanceUrl);
                            recordsWithData.push({
                                link: link,
                                record: recordWithUrlsBasic,
                                objectType: sfObjectType,
                                objectLabel: config ? config.label : sfObjectType,
                                displayFields: Object.keys(parsedBasic).filter(function(k) { return k !== 'attributes'; }),
                                columns: config ? config.columns : []
                            });
                        } else {
                            var errorMsg = 'Record not found or inaccessible';
                            if (parsedBasic && parsedBasic[0] && parsedBasic[0].message) {
                                errorMsg = parsedBasic[0].message;
                            } else if (parsedBasic && parsedBasic.message) {
                                errorMsg = parsedBasic.message;
                            }
                            gs.warn('Salesforce record fetch failed: ' + sfRecordId + ' (Status: ' + statusBasic + ', Error: ' + errorMsg + ')');
                            recordsWithData.push({
                                link: link,
                                record: null,
                                error: errorMsg,
                                objectType: sfObjectType,
                                objectLabel: config ? config.label : sfObjectType,
                                displayFields: fieldsList,
                                columns: config ? config.columns : []
                            });
                        }
                    } catch (retryErr) {
                        var errorMsg = 'Failed to fetch record';
                        if (parsed && parsed[0] && parsed[0].message) {
                            errorMsg = parsed[0].message;
                        } else if (parsed && parsed.message) {
                            errorMsg = parsed.message;
                        }
                        gs.warn('Salesforce record fetch failed after retry: ' + sfRecordId + ' - ' + errorMsg);
                        recordsWithData.push({
                            link: link,
                            record: null,
                            error: errorMsg,
                            objectType: sfObjectType,
                            objectLabel: config ? config.label : sfObjectType,
                            displayFields: fieldsList,
                            columns: config ? config.columns : []
                        });
                    }
                }
            } catch (fetchErr) {
                gs.warn('Exception fetching Salesforce record ' + sfRecordId + ': ' + fetchErr.message);
                recordsWithData.push({
                    link: link,
                    record: null,
                    error: 'Failed to fetch record: ' + (fetchErr.message || String(fetchErr)),
                    objectType: sfObjectType,
                    objectLabel: config ? config.label : sfObjectType,
                    displayFields: fieldsList,
                    columns: config ? config.columns : []
                });
            }
        }

        response.setStatus(200);
        writer.writeString(JSON.stringify({
            success: true,
            links: linkedRecords,
            records: recordsWithData
        }));

    } catch (err) {
        gs.error('Error in Salesforce record link GET handler: ' + err.message + '\nStack: ' + err.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + (err.message || String(err))
        }));
    }
})(request, response);

