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
        var objectName = getParam('object_name') || getParam('objectName');
        
        if (!objectName) {
            response.setStatus(400);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Missing required parameter: object_name'
            }));
            return;
        }

        
        var objConfigGr = new GlideRecord('x_peekl_salesfor_0_salesforce_object_config');
        objConfigGr.addQuery('sf_object_name', objectName);
        objConfigGr.query();
        
        if (!objConfigGr.next()) {
            response.setStatus(404);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Object configuration not found for object_name: ' + objectName
            }));
            return;
        }

        var objectConfigSysId = objConfigGr.getUniqueValue();

        
        var selectedRelGr = new GlideRecord('x_peekl_salesfor_0_salesforce_selected_related_objects');
        selectedRelGr.addQuery('object_config', objectConfigSysId);
        selectedRelGr.orderBy('order');
        selectedRelGr.query();

        var selectedRelationships = [];
        while (selectedRelGr.next()) {
            selectedRelationships.push({
                sys_id: selectedRelGr.getUniqueValue(),
                relationship_name: selectedRelGr.getValue('relationship_name'),
                relationship_label: selectedRelGr.getValue('relationship_label') || selectedRelGr.getValue('relationship_name'),
                order: parseInt(selectedRelGr.getValue('order')) || 100
            });
        }

        if (selectedRelationships.length === 0) {
            response.setStatus(200);
            writer.writeString(JSON.stringify({
                success: true,
                object_name: objectName,
                message: 'No selected related objects found for this object',
                related_objects: []
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

        const instanceUrl = connection.instance_url.replace(/\/+$/, '');

        const parentDescribeEndpoint = instanceUrl + '/services/data/v58.0/sobjects/' + objectName + '/describe';
        const parentDescribeReq = new sn_ws.RESTMessageV2();
        parentDescribeReq.setEndpoint(parentDescribeEndpoint);
        parentDescribeReq.setHttpMethod('GET');
        parentDescribeReq.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        parentDescribeReq.setRequestHeader('Accept', 'application/json');

        const parentDescribeRes = parentDescribeReq.execute();
        const parentDescribeStatus = parentDescribeRes.getStatusCode();
        const parentDescribeBody = parentDescribeRes.getBody();
        const parentDescribeData = safeJsonParse(parentDescribeBody);

        if (parentDescribeStatus < 200 || parentDescribeStatus >= 300 || !parentDescribeData) {
            response.setStatus(parentDescribeStatus || 500);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Failed to get parent object describe: ' + (parentDescribeData && parentDescribeData.message ? parentDescribeData.message : parentDescribeBody || 'Unknown error')
            }));
            return;
        }

        
        var childRelationships = parentDescribeData.childRelationships || [];
        var relationshipMap = {};
        for (var i = 0; i < childRelationships.length; i++) {
            var rel = childRelationships[i];
            if (rel.relationshipName && rel.childSObject) {
                relationshipMap[rel.relationshipName] = {
                    childSObject: rel.childSObject,
                    label: rel.label || rel.relationshipName,
                    field: rel.field
                };
            }
        }

     

        
        var selectedColumnsMap = {}; 
        try {
            for (var m = 0; m < selectedRelationships.length; m++) {
                var selRelForCols = selectedRelationships[m];
                var selRelSysId = selRelForCols.sys_id;
                var selectedCols = new Set();
                
                var colGr = new GlideRecord('x_peekl_salesfor_0_salesforce_related_object_columns');
                colGr.addQuery('selected_related_object', selRelSysId);
                colGr.addQuery('active', true);
                colGr.query();
                
                while (colGr.next()) {
                    var colName = colGr.getValue('column_name');
                    if (colName) {
                        selectedCols.add(colName);
                    }
                }
                
                selectedColumnsMap[selRelSysId] = selectedCols;
            }
        } catch (dbErr) {
            gs.warn('Error fetching selected columns: ' + dbErr.message);
        }

        
        var relatedObjectsResults = [];
        var totalFields = 0;

        for (var k = 0; k < selectedRelationships.length; k++) {
            var selRel = selectedRelationships[k];
            var relationshipName = selRel.relationship_name;
            var selRelSysId = selRel.sys_id;
            var relationshipInfo = relationshipMap[relationshipName];

            if (!relationshipInfo) {
                
                relatedObjectsResults.push({
                    relationship_name: relationshipName,
                    relationship_label: selRel.relationship_label,
                    success: false,
                    error: 'Relationship not found in Salesforce describe API',
                    fields: []
                });
                continue;
            }

            var childObjectName = relationshipInfo.childSObject;
            var selectedColsForThisRel = selectedColumnsMap[selRelSysId] || new Set();

            
            const childDescribeEndpoint = instanceUrl + '/services/data/v58.0/sobjects/' + childObjectName + '/describe';
            const childDescribeReq = new sn_ws.RESTMessageV2();
            childDescribeReq.setEndpoint(childDescribeEndpoint);
            childDescribeReq.setHttpMethod('GET');
            childDescribeReq.setRequestHeader('Authorization', 'Bearer ' + accessToken);
            childDescribeReq.setRequestHeader('Accept', 'application/json');

            const childDescribeRes = childDescribeReq.execute();
            const childDescribeStatus = childDescribeRes.getStatusCode();
            const childDescribeBody = childDescribeRes.getBody();
            const childDescribeData = safeJsonParse(childDescribeBody);

            if (childDescribeStatus < 200 || childDescribeStatus >= 300) {
                gs.warn('Salesforce describe API failed for child object: ' + childObjectName + ' Status=' + childDescribeStatus);
                relatedObjectsResults.push({
                    relationship_name: relationshipName,
                    relationship_label: selRel.relationship_label,
                    child_object_name: childObjectName,
                    success: false,
                    error: 'Failed to get child object describe: ' + (childDescribeData && childDescribeData.message ? childDescribeData.message : 'Unknown error'),
                    fields: []
                });
                continue;
            }

            
            var fields = [];
            if (childDescribeData && childDescribeData.fields && Array.isArray(childDescribeData.fields)) {
                for (var j = 0; j < childDescribeData.fields.length; j++) {
                    var field = childDescribeData.fields[j];
                    
                    
                    if (field.deprecated === false || field.deprecated === undefined) {
                        fields.push({
                            name: field.name,
                            label: field.label,
                            type: field.type,
                            length: field.length || null,
                            required: field.nillable === false,
                            updateable: field.updateable || false,
                            createable: field.createable || false,
                            sortable: field.sortable || false,
                            filterable: field.filterable || false,
                            searchable: field.searchable || false,
                            nameField: field.nameField || false,
                            custom: field.custom || false,
                            calculated: field.calculated || false,
                            referenceTo: field.referenceTo || [],
                            relationshipName: field.relationshipName || null,
                            helpText: field.inlineHelpText || null,
                            selected: selectedColsForThisRel.has(field.name)
                        });
                    }
                }
            }

            
            fields.sort(function(a, b) {
                return (a.label || a.name).localeCompare(b.label || b.name);
            });

            totalFields += fields.length;

            relatedObjectsResults.push({
                selected_related_object_sys_id: selRelSysId,
                relationship_name: relationshipName,
                relationship_label: selRel.relationship_label,
                child_object_name: childObjectName,
                child_object_label: childDescribeData && childDescribeData.label ? childDescribeData.label : childObjectName,
                success: true,
                total_fields: fields.length,
                fields: fields,
                metadata: {
                    name: childDescribeData && childDescribeData.name ? childDescribeData.name : childObjectName,
                    label: childDescribeData && childDescribeData.label ? childDescribeData.label : childObjectName,
                    keyPrefix: childDescribeData && childDescribeData.keyPrefix ? childDescribeData.keyPrefix : null,
                    nameField: childDescribeData && childDescribeData.nameField ? childDescribeData.nameField : null
                }
            });
        }

        response.setStatus(200);
        writer.writeString(JSON.stringify({
            success: true,
            object_name: objectName,
            object_label: parentDescribeData && parentDescribeData.label ? parentDescribeData.label : objectName,
            total_related_objects: relatedObjectsResults.length,
            total_fields: totalFields,
            related_objects: relatedObjectsResults
        }));

    } catch (error) {
        gs.error('Error in Salesforce related object columns GET handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + error.message
        }));
    }

})(request, response);
