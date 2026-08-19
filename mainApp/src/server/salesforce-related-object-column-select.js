(function process(request, response) {
    response.setContentType('application/json');
    
    try {
        var body = request.body;
        var bodyString = request.bodyString;
        var data;
        var isBatch = false;
        if (body && typeof body === 'object' && body.data !== undefined) {
            body = body.data;
        }
        if ((!body || body === null || body === undefined) && bodyString) {
            try {
                body = JSON.parse(bodyString);
                if (body && typeof body === 'object' && body.data !== undefined) {
                    body = body.data;
                }
            } catch (parseErr) {
                gs.warn('Failed to parse bodyString: ' + parseErr.message);
            }
        }
        
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
                if (body && typeof body === 'object' && body.data !== undefined) {
                    body = body.data;
                }
            } catch (parseErr) {
                response.setStatus(400);
                response.setBody({
                    success: false,
                    error: 'Invalid JSON in request body: ' + parseErr.message
                });
                return;
            }
        }
        if (body && typeof body === 'object' && !Array.isArray(body)) {
            if (body.result && Array.isArray(body.result)) {
                body = body.result;
            } else if (body.data && Array.isArray(body.data)) {
                body = body.data;
            } else if (body.columns && Array.isArray(body.columns)) {
                body = body.columns;
            }
        }
        
        if (Array.isArray(body)) {
            data = body;
            isBatch = true;
        } else if (body && typeof body === 'object') {
            if (body.selected_related_object && body.column_name) {
                data = [body];
            } else if (body.column_name) {
                data = [body];
            } else {
                response.setStatus(400);
                response.setBody({
                    success: false,
                    error: 'Invalid request body format. Expected array of objects or single object with column_name field. Got: ' + JSON.stringify(Object.keys(body || {}))
                });
                return;
            }
        } else {
            response.setStatus(400);
            response.setBody({
                success: false,
                error: 'Invalid request body format. Expected array of objects or single object with column_name field. Body type: ' + typeof body
            });
            return;
        }

        
        
        var objectNameFromQuery = null;
        var relationshipNameFromQuery = null;
        try {
            if (request && request.queryParams) {
                var qp = request.queryParams;
                if (qp.object_name !== undefined && qp.object_name !== null && qp.object_name !== '') {
                    objectNameFromQuery = '' + qp.object_name;
                }
                if (qp.relationship_name !== undefined && qp.relationship_name !== null && qp.relationship_name !== '') {
                    relationshipNameFromQuery = '' + qp.relationship_name;
                }
            }
            if (request && typeof request.getParameter === 'function') {
                if (objectNameFromQuery === null || objectNameFromQuery === '') {
                    var oq = request.getParameter('object_name');
                    if (oq !== null && oq !== undefined && oq !== '') {
                        objectNameFromQuery = '' + oq;
                    }
                }
                if (relationshipNameFromQuery === null || relationshipNameFromQuery === '') {
                    var rq = request.getParameter('relationship_name');
                    if (rq !== null && rq !== undefined && rq !== '') {
                        relationshipNameFromQuery = '' + rq;
                    }
                }
            }
        } catch (e) {
        }
        
        if (!data || !Array.isArray(data)) {
            response.setStatus(400);
            response.setBody({
                success: false,
                error: 'No valid data provided. Expected array of column objects.'
            });
            return;
        }
        
        
        if (data.length === 0 && objectNameFromQuery && relationshipNameFromQuery) {
            
            var objConfigGr = new GlideRecord('x_1955226_peeklo_1_salesforce_object_config');
            objConfigGr.addQuery('sf_object_name', objectNameFromQuery);
            objConfigGr.query();
            
            if (!objConfigGr.next()) {
                response.setStatus(404);
                response.setBody({
                    success: false,
                    error: 'Object configuration not found for object_name: ' + objectNameFromQuery
                });
                return;
            }

            var objectConfigSysId = objConfigGr.getUniqueValue();

            
            var selRelGr = new GlideRecord('x_1955226_peeklo_1_salesforce_selected_related_objects');
            selRelGr.addQuery('object_config', objectConfigSysId);
            selRelGr.addQuery('relationship_name', relationshipNameFromQuery);
            selRelGr.query();

            if (!selRelGr.next()) {
                response.setStatus(404);
                response.setBody({
                    success: false,
                    error: 'Selected related object not found for object_name: ' + objectNameFromQuery + ', relationship_name: ' + relationshipNameFromQuery
                });
                return;
            }

            var selRelObjId = selRelGr.getUniqueValue();
            
            
            var columnsBySelectedRelObj = {};
            columnsBySelectedRelObj[selRelObjId] = []; 
            
            
            var skipDataProcessing = true;
        } else if (data.length === 0) {
            response.setStatus(400);
            response.setBody({
                success: false,
                error: 'No valid data provided. Expected non-empty array of column objects, or provide object_name and relationship_name query parameters to clear all columns.'
            });
            return;
        } else {
            
            var columnsBySelectedRelObj = null;
            var skipDataProcessing = false;
        }
        
        
        if (!skipDataProcessing) {
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                
                if (i === 0) {
                    if (item && typeof item === 'object') {
                        gs.info('First item full: ' + JSON.stringify(item).substring(0, 200));
                    }
                }
                
                if (!item || typeof item !== 'object') {
                    response.setStatus(400);
                    response.setBody({
                        success: false,
                        error: 'Invalid item at index ' + i + ': expected object, got ' + typeof item + (item ? (', value: ' + String(item).substring(0, 100)) : '')
                    });
                    return;
                }
                
                var columnName = item.column_name || item.columnName || item.name || item.field_name || item.fieldName;
                if (!columnName) {
                    response.setStatus(400);
                    response.setBody({
                        success: false,
                        error: 'Missing required field: column_name is required for all items (item at index ' + i + ' is missing it). Item keys: ' + JSON.stringify(Object.keys(item))
                    });
                    return;
                }
                
                if (!item.column_name && columnName) {
                    item.column_name = columnName;
                }

                if (!item.selected_related_object) {
                    var objectName = item.object_name || item.objectName;
                    var relationshipName = item.relationship_name || item.relationshipName;

                    if (!objectName || !relationshipName) {
                        response.setStatus(400);
                        response.setBody({
                            success: false,
                            error: 'Missing required fields: either selected_related_object (sys_id) OR (object_name and relationship_name) are required for all items'
                        });
                        return;
                    }

                    
                    var objConfigGr = new GlideRecord('x_1955226_peeklo_1_salesforce_object_config');
                    objConfigGr.addQuery('sf_object_name', objectName);
                    objConfigGr.query();
                    
                    if (!objConfigGr.next()) {
                        response.setStatus(404);
                        response.setBody({
                            success: false,
                            error: 'Object configuration not found for object_name: ' + objectName
                        });
                        return;
                    }

                    var objectConfigSysId = objConfigGr.getUniqueValue();

                    
                    var selRelGr = new GlideRecord('x_1955226_peeklo_1_salesforce_selected_related_objects');
                    selRelGr.addQuery('object_config', objectConfigSysId);
                    selRelGr.addQuery('relationship_name', relationshipName);
                    selRelGr.query();

                    if (!selRelGr.next()) {
                        response.setStatus(404);
                        response.setBody({
                            success: false,
                            error: 'Selected related object not found for object_name: ' + objectName + ', relationship_name: ' + relationshipName
                        });
                        return;
                    }

                    
                    item.selected_related_object = selRelGr.getUniqueValue();
                }
            }

            
            columnsBySelectedRelObj = {};
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                var selRelObjId = item.selected_related_object;
                if (!columnsBySelectedRelObj[selRelObjId]) {
                    columnsBySelectedRelObj[selRelObjId] = [];
                }
                columnsBySelectedRelObj[selRelObjId].push(item);
            }
        }
        
        

        var results = [];
        var successCount = 0;
        var failCount = 0;
        var deletedCount = 0;
        var deleteFailCount = 0;

        
        for (var selRelObjId in columnsBySelectedRelObj) {
            var incomingColumns = columnsBySelectedRelObj[selRelObjId];
            var incomingColumnNames = {};
            for (var i = 0; i < incomingColumns.length; i++) {
                incomingColumnNames[incomingColumns[i].column_name] = incomingColumns[i];
            }

            
            var existingGr = new GlideRecord('x_1955226_peeklo_1_salesforce_related_object_columns');
            existingGr.addQuery('selected_related_object', selRelObjId);
            existingGr.query();

            var existingColumnsToDelete = [];
            while (existingGr.next()) {
                var existingColumnName = existingGr.getValue('column_name');
                if (!incomingColumnNames[existingColumnName]) {
                    
                    existingColumnsToDelete.push({
                        sys_id: existingGr.getUniqueValue(),
                        column_name: existingColumnName
                    });
                }
            }

            
            for (var d = 0; d < existingColumnsToDelete.length; d++) {
                var colToDelete = existingColumnsToDelete[d];
                try {
                    var deleteGr = new GlideRecord('x_1955226_peeklo_1_salesforce_related_object_columns');
                    deleteGr.addQuery('selected_related_object', selRelObjId);
                    deleteGr.addQuery('column_name', colToDelete.column_name);
                    deleteGr.setWorkflow(false);
                    deleteGr.query();
                    deleteGr.deleteMultiple();
                    deletedCount++;
                } catch (deleteErr) {
                    deleteFailCount++;
                    results.push({
                        selected_related_object: selRelObjId,
                        column_name: colToDelete.column_name,
                        action: 'delete',
                        success: false,
                        error: deleteErr.message || String(deleteErr)
                    });
                }
            }

            
            for (var i = 0; i < incomingColumns.length; i++) {
                var item = incomingColumns[i];
                var result = {
                    selected_related_object: item.selected_related_object,
                    column_name: item.column_name
                };

                
                var checkGr = new GlideRecord('x_1955226_peeklo_1_salesforce_related_object_columns');
                checkGr.addQuery('selected_related_object', item.selected_related_object);
                checkGr.addQuery('column_name', item.column_name);
                checkGr.query();

                var isUpdate = checkGr.next();
                var sysId = null;

                try {
                    var gr;
                    if (isUpdate) {
                        
                        gr = checkGr;
                        sysId = gr.getUniqueValue();
                    } else {
                        
                        gr = new GlideRecord('x_1955226_peeklo_1_salesforce_related_object_columns');
                        gr.initialize();
                    }

                    
                    gr.setValue('selected_related_object', item.selected_related_object);
                    gr.setValue('column_name', item.column_name);

                    
                    if (item.column_label !== undefined && item.column_label !== null) {
                        gr.setValue('column_label', item.column_label);
                    }

                    if (item.active !== undefined && item.active !== null) {
                        gr.setValue('active', item.active);
                    } else if (!isUpdate) {
                        gr.setValue('active', true);
                    }

                    if (item.order !== undefined && item.order !== null) {
                        gr.setValue('order', item.order);
                    } else if (!isUpdate) {
                        gr.setValue('order', 100);
                    }

                    
                    if (isUpdate) {
                        gr.update();
                    } else {
                        sysId = gr.insert();
                    }

                    if (!sysId && !isUpdate) {
                        result.success = false;
                        result.error = 'Failed to create column configuration';
                        result.action = 'create';
                        failCount++;
                    } else {
                        result.success = true;
                        result.sys_id = sysId || checkGr.getUniqueValue();
                        result.action = isUpdate ? 'updated' : 'created';
                        successCount++;
                    }
                } catch (itemErr) {
                    result.success = false;
                    result.error = itemErr.message || String(itemErr);
                    result.action = isUpdate ? 'update' : 'create';
                    failCount++;
                }

                results.push(result);
            }
        }

        
        var allSuccess = (failCount === 0 && deleteFailCount === 0);
        var statusCode = allSuccess ? 201 : ((successCount > 0 || deletedCount > 0) ? 207 : 400); 

        response.setStatus(statusCode);
        response.setBody({
            success: allSuccess,
            batch: isBatch,
            total: data.length,
            succeeded: successCount,
            failed: failCount,
            deleted: deletedCount,
            delete_failed: deleteFailCount,
            message: allSuccess ? 
                (successCount + ' columns configured, ' + deletedCount + ' columns removed successfully') :
                (successCount + ' succeeded, ' + failCount + ' failed, ' + deletedCount + ' deleted, ' + deleteFailCount + ' delete failed'),
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
