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

    function extractFieldFromComponent(layoutComponent) {
        if (!layoutComponent || !layoutComponent.details) {
            return null;
        }

        var details = layoutComponent.details;
        if (!details.name || !details.type) {
            return null;
        }

        var fieldData = {
            name: details.name,
            label: details.label || details.name,
            type: details.type.toLowerCase(),
            required: false,
            createable: true,
            updateable: details.updateable !== false,
            picklistValues: [],
            htmlFormatted: details.htmlFormatted || false
        };

        if (details.picklistValues && Array.isArray(details.picklistValues) && details.picklistValues.length > 0) {
            for (var p = 0; p < details.picklistValues.length; p++) {
                var picklistValue = details.picklistValues[p];
                if (!picklistValue.active) {
                    continue;
                }
                fieldData.picklistValues.push({
                    label: picklistValue.label || picklistValue.value,
                    value: picklistValue.value
                });
            }
        }
        else if (details.type.toLowerCase() === 'boolean') {
            fieldData.picklistValues.push({ label: 'TRUE', value: true });
            fieldData.picklistValues.push({ label: 'FALSE', value: false });
        }

        return fieldData;
    }

    function parseLayoutSections(editLayoutSections, describeData) {
        if (!editLayoutSections || !Array.isArray(editLayoutSections)) {
            return [];
        }

        var fieldsMap = {}; 
        var fieldsArray = [];

        for (var sectionIdx = 0; sectionIdx < editLayoutSections.length; sectionIdx++) {
            var section = editLayoutSections[sectionIdx];
            if (!section.layoutRows || !Array.isArray(section.layoutRows)) {
                continue;
            }

            for (var rowIdx = 0; rowIdx < section.layoutRows.length; rowIdx++) {
                var row = section.layoutRows[rowIdx];
                if (!row.layoutItems || !Array.isArray(row.layoutItems)) {
                    continue;
                }

                for (var itemIdx = 0; itemIdx < row.layoutItems.length; itemIdx++) {
                    var layoutItem = row.layoutItems[itemIdx];

                    
                    if (!layoutItem.editableForNew) {
                        continue;
                    }

                    
                    var components = [];
                    if (layoutItem.layoutComponents && Array.isArray(layoutItem.layoutComponents)) {
                        components = layoutItem.layoutComponents;
                    } else if (layoutItem.layoutComponents) {
                        components = [layoutItem.layoutComponents];
                    }

                    
                    for (var compIdx = 0; compIdx < components.length; compIdx++) {
                        var layoutComponent = components[compIdx];

                        
                        if (layoutComponent.components && Array.isArray(layoutComponent.components)) {
                            for (var nestedIdx = 0; nestedIdx < layoutComponent.components.length; nestedIdx++) {
                                var nestedComponent = layoutComponent.components[nestedIdx];
                                var fieldData = extractFieldFromComponent(nestedComponent);
                                if (fieldData && !fieldsMap[fieldData.name]) {
                                    fieldData.required = layoutItem.required || false;
                                    fieldsMap[fieldData.name] = fieldData;
                                    fieldsArray.push(fieldData);
                                }
                            }
                        } else {
                            
                            var fieldData = extractFieldFromComponent(layoutComponent);
                            if (fieldData && !fieldsMap[fieldData.name]) {
                                fieldData.required = layoutItem.required || false;
                                fieldsMap[fieldData.name] = fieldData;
                                fieldsArray.push(fieldData);
                            }
                        }
                    }
                }
            }
        }

        
        if (describeData && describeData.fields && Array.isArray(describeData.fields)) {
            var describeFieldsMap = {};
            for (var f = 0; f < describeData.fields.length; f++) {
                describeFieldsMap[describeData.fields[f].name] = describeData.fields[f];
            }

            
            for (var fieldIdx = 0; fieldIdx < fieldsArray.length; fieldIdx++) {
                var field = fieldsArray[fieldIdx];
                var describeField = describeFieldsMap[field.name];
                if (describeField) {
                    field.length = describeField.length;
                    if (!field.required && describeField.nillable === false && !describeField.defaultedOnCreate) {
                        field.required = true;
                    }
                    
                    if (field.picklistValues.length === 0 && describeField.picklistValues && Array.isArray(describeField.picklistValues)) {
                        for (var p = 0; p < describeField.picklistValues.length; p++) {
                            var picklistValue = describeField.picklistValues[p];
                            if (picklistValue.active) {
                                field.picklistValues.push({
                                    label: picklistValue.label || picklistValue.value,
                                    value: picklistValue.value
                                });
                            }
                        }
                    }
                    
                    if (!field.htmlFormatted && describeField.htmlFormatted) {
                        field.htmlFormatted = true;
                    }
                }
            }
        }

        return fieldsArray;
    }

    


    function fetchObjectDescribe(objectName, instanceUrl, accessToken) {
        try {
            var describeEndpoint = instanceUrl + '/services/data/v56.0/sobjects/' + objectName + '/describe';
            var describeReq = new sn_ws.RESTMessageV2();
            describeReq.setEndpoint(describeEndpoint);
            describeReq.setHttpMethod('GET');
            describeReq.setRequestHeader('Authorization', 'Bearer ' + accessToken);
            describeReq.setRequestHeader('Accept', 'application/json');

            var describeRes = describeReq.execute();
            var describeStatus = describeRes.getStatusCode();
            var describeBody = describeRes.getBody();

            if (describeStatus >= 200 && describeStatus < 300) {
                return safeJsonParse(describeBody);
            }
        } catch (e) {
            gs.warn('Error fetching object describe for ' + objectName + ': ' + e.message);
        }
        return null;
    }

   
    function fetchRecordTypeLayout(objectName, recordTypeId, instanceUrl, accessToken) {
        try {
            
            var layoutsEndpoint = instanceUrl + '/services/data/v56.0/sobjects/' + objectName + '/describe/layouts';
            var layoutsReq = new sn_ws.RESTMessageV2();
            layoutsReq.setEndpoint(layoutsEndpoint);
            layoutsReq.setHttpMethod('GET');
            layoutsReq.setRequestHeader('Authorization', 'Bearer ' + accessToken);
            layoutsReq.setRequestHeader('Accept', 'application/json');

            var layoutsRes = layoutsReq.execute();
            var layoutsStatus = layoutsRes.getStatusCode();
            var layoutsBody = layoutsRes.getBody();

            if (layoutsStatus < 200 || layoutsStatus >= 300) {
                gs.error('Salesforce layouts API failed. Status=' + layoutsStatus + ' Body=' + layoutsBody);
                return null;
            }

            var layoutsData = safeJsonParse(layoutsBody);
            if (!layoutsData || !layoutsData.recordTypeMappings || !Array.isArray(layoutsData.recordTypeMappings)) {
                gs.warn('No recordTypeMappings found in layouts response');
                return null;
            }

            
            var layoutUrl = null;
            if (recordTypeId === 'Master' || !recordTypeId) {
                
                for (var i = 0; i < layoutsData.recordTypeMappings.length; i++) {
                    var mapping = layoutsData.recordTypeMappings[i];
                    if (mapping.defaultRecordTypeMapping || mapping.recordTypeId === null) {
                        layoutUrl = mapping.urls && mapping.urls.layout;
                        break;
                    }
                }
            } else {
                
                for (var i = 0; i < layoutsData.recordTypeMappings.length; i++) {
                    var mapping = layoutsData.recordTypeMappings[i];
                    if (mapping.recordTypeId === recordTypeId) {
                        layoutUrl = mapping.urls && mapping.urls.layout;
                        break;
                    }
                }
            }

            if (!layoutUrl) {
                gs.warn('Layout URL not found for record type: ' + recordTypeId);
                return null;
            }

            
            var fullLayoutUrl = layoutUrl;
            if (layoutUrl.indexOf('http') !== 0) {
                fullLayoutUrl = instanceUrl + layoutUrl;
            }

            var layoutReq = new sn_ws.RESTMessageV2();
            layoutReq.setEndpoint(fullLayoutUrl);
            layoutReq.setHttpMethod('GET');
            layoutReq.setRequestHeader('Authorization', 'Bearer ' + accessToken);
            layoutReq.setRequestHeader('Accept', 'application/json');

            var layoutRes = layoutReq.execute();
            var layoutStatus = layoutRes.getStatusCode();
            var layoutBody = layoutRes.getBody();

            if (layoutStatus >= 200 && layoutStatus < 300) {
                return safeJsonParse(layoutBody);
            } else {
                gs.error('Salesforce layout API failed. Status=' + layoutStatus + ' Body=' + layoutBody);
                return null;
            }
        } catch (e) {
            gs.error('Error fetching record type layout for ' + objectName + ', recordType: ' + recordTypeId + ': ' + e.message);
        }
        return null;
    }

    try {
        const connectionService = new x_1955226_peeklo_1.SalesforceConnectionService();
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

        const oauthService = new x_1955226_peeklo_1.SalesforceOAuthService();
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

        var objectName = getParam('object_name') || getParam('objectName');
        var recordTypeId = getParam('record_type_id') || getParam('recordTypeId') || 'Master';
        var instanceUrl = connection.instance_url.replace(/\/+$/, '');

        if (!objectName) {
            response.setStatus(400);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Missing required parameter: object_name'
            }));
            return;
        }

        
        var layoutData = fetchRecordTypeLayout(objectName, recordTypeId, instanceUrl, accessToken);
        if (!layoutData) {
            response.setStatus(404);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Layout not found for object ' + objectName + ' with record type ' + recordTypeId
            }));
            return;
        }

        
        var describeData = fetchObjectDescribe(objectName, instanceUrl, accessToken);

        
        var fields = [];
        if (layoutData.editLayoutSections) {
            fields = parseLayoutSections(layoutData.editLayoutSections, describeData);
        }

        if (fields.length === 0 && layoutData.detailLayoutSections) {
            gs.warn('No fields in editLayoutSections, trying detailLayoutSections');
        }

        response.setStatus(200);
        writer.writeString(JSON.stringify({
            success: true,
            objectName: objectName,
            recordTypeId: recordTypeId,
            fields: fields,
            layoutSections: layoutData.editLayoutSections || null 
        }));

    } catch (error) {
        gs.error('Error in Salesforce object layout GET handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + error.message
        }));
    }

})(request, response);
