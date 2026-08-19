(function process(request, response) {
    response.setContentType('application/json');

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
                var v2 = request.getParameter(name);
                if (v2 !== null && v2 !== undefined && v2 !== '') return '' + v2;
            }
        } catch (e) { }
        return null;
    }

    try {
        var body = request.body;
        var data = {};

        if (typeof body === 'string') {
            data = safeJsonParse(body) || {};
        } else if (body && typeof body === 'object') {
            if (body.data && typeof body.data === 'object') {
                data = body.data;
            } else {
                data = body;
            }
        }

        
        var objectName = data.object_name || data.sf_object_name || getParam('object_name') || getParam('sf_object_name');
        var objectConfigSysId = data.object_config || data.object_config_sys_id || getParam('object_config') || getParam('object_config_sys_id');

        
        if (!objectConfigSysId && objectName) {
            var objCfgGr = new GlideRecord('x_1955226_peeklo_1_salesforce_object_config');
            objCfgGr.addQuery('sf_object_name', objectName);
            objCfgGr.query();
            if (objCfgGr.next()) {
                objectConfigSysId = objCfgGr.getUniqueValue();
                gs.info('[Peeklo] Related Objects Select: Resolved object_config ' + objectConfigSysId + ' for object_name: ' + objectName);
            } else {
                response.setStatus(404);
                response.setBody({
                    success: false,
                    error: 'Object configuration not found for object_name: ' + objectName
                });
                return;
            }
        }
        
        gs.info('[Peeklo] Related Objects Select: Processing for object_config: ' + objectConfigSysId + ', object_name: ' + (objectName || 'N/A'));

        if (!objectConfigSysId) {
            response.setStatus(400);
            response.setBody({
                success: false,
                error: 'Missing required parameter: object_name or object_config (sys_id)'
            });
            return;
        }


        var incomingList = data.relatedObjects || data.related_objects || data.relationships || [];
        var clearAll = data.clear_all === true || data.clearAll === true;

        if (!Array.isArray(incomingList)) {
            response.setStatus(400);
            response.setBody({
                success: false,
                error: 'Expected an array of related objects under relatedObjects / related_objects / relationships'
            });
            return;
        }
        
        
        if (clearAll || incomingList.length === 0) {
            gs.info('[Peeklo] Related Objects Select: Clear all flag detected or empty array - will delete all existing records for object_config: ' + objectConfigSysId);
        }

        
        var incomingByRelName = {};
        var normalizedIncoming = [];

        for (var i = 0; i < incomingList.length; i++) {
            var item = incomingList[i];
            var relationshipName, label;

            if (item === null || item === undefined) {
                continue;
            }

            if (typeof item === 'string') {
                
                relationshipName = item;
                label = item;
            } else if (typeof item === 'object') {
                relationshipName = item.relationshipName || item.relationship_name;
                label = item.name || item.relationship_label || relationshipName;
            }

            if (!relationshipName) {
                
                continue;
            }

            if (!incomingByRelName[relationshipName]) {
                incomingByRelName[relationshipName] = {
                    relationship_name: relationshipName,
                    relationship_label: label || relationshipName,
                    order: (typeof item === 'object' && item.order !== undefined) ? item.order : (i + 1) * 10
                };
                normalizedIncoming.push(incomingByRelName[relationshipName]);
            }
        }

        var results = [];
        var createdCount = 0;
        var updatedCount = 0;
        var deletedCount = 0;
        var deleteFailCount = 0;


        var existingGr = new GlideRecord('x_1955226_peeklo_1_salesforce_selected_related_objects');
        existingGr.addQuery('object_config', objectConfigSysId);
        existingGr.query();

        gs.info('[Peeklo] Related Objects Select: Incoming relationships: ' + Object.keys(incomingByRelName).join(', '));

        var existingRecords = [];
        while (existingGr.next()) {
            var existingRelName = existingGr.getValue('relationship_name');
            var existingSysId = existingGr.getUniqueValue();
            existingRecords.push({
                sys_id: existingSysId,
                relationship_name: existingRelName
            });
        }

        gs.info('[Peeklo] Related Objects Select: Found ' + existingRecords.length + ' existing records for object_config ' + objectConfigSysId);

        if (existingRecords.length > 0) {
            var existingList = existingRecords.map(function(r) { return r.relationship_name; });
            gs.info('[Peeklo] Related Objects Select: Existing relationship names: ' + existingList.join(', '));
        } else {
            gs.info('[Peeklo] Related Objects Select: No existing records found for this object_config');
            gs.info('[Peeklo] Related Objects Select: NOTE - This only processes records for object_config ' + objectConfigSysId + '. Other object_configs are not affected.');
        }

        
        var existingToDelete = [];
        for (var r = 0; r < existingRecords.length; r++) {
            var existingRecord = existingRecords[r];
            var existingRelName = existingRecord.relationship_name;
            var existingSysId = existingRecord.sys_id;
            
            
            
            if (clearAll || incomingList.length === 0 || !incomingByRelName[existingRelName]) {
                existingToDelete.push({
                    sys_id: existingSysId,
                    relationship_name: existingRelName
                });
                gs.info('[Peeklo] Related Objects Select: Marking for deletion - sys_id: ' + existingSysId + ', relationship_name: ' + existingRelName);
            } else {
                gs.info('[Peeklo] Related Objects Select: Keeping - relationship_name: ' + existingRelName);
            }
        }

        gs.info('[Peeklo] Related Objects Select: Total records to delete: ' + existingToDelete.length);

        
        gs.info('[Peeklo] Related Objects Select: Starting deletion process for ' + existingToDelete.length + ' record(s)');
        
        for (var d = 0; d < existingToDelete.length; d++) {
            var relToDelete = existingToDelete[d];
            gs.info('[Peeklo] Related Objects Select: Attempting to delete - sys_id: ' + relToDelete.sys_id + ', relationship_name: ' + relToDelete.relationship_name);
            
            try {
                var queueService = new x_1955226_peeklo_1.SyncEventQueueService();
                var cascadePayload = {
                    eventType: 'cascade_delete',
                    parentTable: 'x_1955226_peeklo_1_salesforce_selected_related_objects',
                    parentSysId: relToDelete.sys_id,
                    childTables: [
                        'x_1955226_peeklo_1_salesforce_related_object_columns'
                    ]
                };
                queueService.enqueuePayload(cascadePayload);
                gs.info('[Peeklo] Related Objects Select: Queued cascade delete for child columns of relationship_name: ' + relToDelete.relationship_name);
                
                var delGr = new GlideRecord('x_1955226_peeklo_1_salesforce_selected_related_objects');
                delGr.addQuery('object_config', objectConfigSysId);
                delGr.addQuery('relationship_name', relToDelete.relationship_name);
                delGr.setWorkflow(false);
                
                gs.info('[Peeklo] Related Objects Select: Query built for deletion - object_config: ' + objectConfigSysId + ', relationship_name: ' + relToDelete.relationship_name);
                
                var deletedNum = delGr.deleteMultiple();
                gs.info('[Peeklo] Related Objects Select: deleteMultiple() returned: ' + deletedNum + ' for relationship_name: ' + relToDelete.relationship_name);
                
                
                var verifyGr = new GlideRecord('x_1955226_peeklo_1_salesforce_selected_related_objects');
                verifyGr.addQuery('object_config', objectConfigSysId);
                verifyGr.addQuery('relationship_name', relToDelete.relationship_name);
                verifyGr.query();
                var verifyCount = 0;
                while (verifyGr.next()) {
                    verifyCount++;
                }
                var stillExists = verifyCount > 0;

                gs.info('[Peeklo] Related Objects Select: Verification query found ' + verifyCount + ' record(s) still existing for relationship_name: ' + relToDelete.relationship_name);
                
                if (!stillExists || deletedNum > 0) {
                    
                    deletedCount++;
                    gs.info('[Peeklo] Related Objects Select: ✓ Successfully deleted relationship_name: ' + relToDelete.relationship_name);
                    results.push({
                        action: 'delete',
                        success: true,
                        relationship_name: relToDelete.relationship_name
                    });
                } else {
                    
                    deleteFailCount++;
                    gs.error('[Peeklo] Related Objects Select: ✗ Deletion failed - record still exists for relationship_name: ' + relToDelete.relationship_name);
                    results.push({
                        action: 'delete',
                        success: false,
                        relationship_name: relToDelete.relationship_name,
                        error: 'Deletion failed - record still exists'
                    });
                }
            } catch (delErr) {
                var errorMsg = delErr.message || String(delErr);
                gs.error('[Peeklo] Related Objects Select: Exception during deletion for relationship_name: ' + relToDelete.relationship_name + ' - ' + errorMsg);
                
                
                if (errorMsg.indexOf('DeleteRecoveryManager') !== -1 || errorMsg.indexOf('booleanValue') !== -1) {
                    gs.warn('[Peeklo] Related Objects Select: DeleteRecoveryManager error detected, verifying deletion...');
                    var verifyGr = new GlideRecord('x_1955226_peeklo_1_salesforce_selected_related_objects');
                    verifyGr.addQuery('object_config', objectConfigSysId);
                    verifyGr.addQuery('relationship_name', relToDelete.relationship_name);
                    verifyGr.query();
                    var verifyCount = 0;
                    while (verifyGr.next()) {
                        verifyCount++;
                    }

                    if (verifyCount === 0) {

                        deletedCount++;
                        gs.info('[Peeklo] Related Objects Select: ✓ Record was actually deleted despite DeleteRecoveryManager error for relationship_name: ' + relToDelete.relationship_name);
                        results.push({
                            action: 'delete',
                            success: true,
                            relationship_name: relToDelete.relationship_name
                        });
                    } else {
                        deleteFailCount++;
                        gs.error('[Peeklo] Related Objects Select: ✗ DeleteRecoveryManager error - record still exists (count: ' + verifyCount + ') for relationship_name: ' + relToDelete.relationship_name);
                        results.push({
                            action: 'delete',
                            success: false,
                            relationship_name: relToDelete.relationship_name,
                            error: 'DeleteRecoveryManager error - record still exists'
                        });
                    }
                } else {
                    deleteFailCount++;
                    gs.error('[Peeklo] Related Objects Select: ✗ Other error during deletion for relationship_name: ' + relToDelete.relationship_name);
                    results.push({
                        action: 'delete',
                        success: false,
                        relationship_name: relToDelete.relationship_name,
                        error: errorMsg
                    });
                }
            }
        }
        
        gs.info('[Peeklo] Related Objects Select: Deletion process completed - deleted: ' + deletedCount + ', failed: ' + deleteFailCount);

        
        for (var j = 0; j < normalizedIncoming.length; j++) {
            var relItem = normalizedIncoming[j];
            var res = {
                relationship_name: relItem.relationship_name,
                relationship_label: relItem.relationship_label
            };

            try {
                var selGr = new GlideRecord('x_1955226_peeklo_1_salesforce_selected_related_objects');
                selGr.addQuery('object_config', objectConfigSysId);
                selGr.addQuery('relationship_name', relItem.relationship_name);
                selGr.query();

                var isUpdate = selGr.next();
                var sysId = null;

                if (isUpdate) {
                    
                    sysId = selGr.getUniqueValue();
                } else {
                    
                    selGr.initialize();
                }

                selGr.setValue('object_config', objectConfigSysId);
                selGr.setValue('relationship_name', relItem.relationship_name);

                if (relItem.relationship_label !== undefined && relItem.relationship_label !== null) {
                    selGr.setValue('relationship_label', relItem.relationship_label);
                }

                
                if (!isUpdate) {
                    selGr.setValue('active', true);
                }

                
                if (relItem.order !== undefined && relItem.order !== null) {
                    selGr.setValue('order', relItem.order);
                } else if (!isUpdate) {
                    selGr.setValue('order', (j + 1) * 10);
                }

                if (isUpdate) {
                    selGr.update();
                } else {
                    sysId = selGr.insert();
                }

                if (!sysId && !isUpdate) {
                    res.success = false;
                    res.action = 'create';
                    res.error = 'Failed to create selected related object record';
                } else {
                    res.success = true;
                    res.sys_id = sysId || selGr.getUniqueValue();
                    res.action = isUpdate ? 'updated' : 'created';
                    if (isUpdate) updatedCount++; else createdCount++;
                }
            } catch (upErr) {
                res.success = false;
                res.action = 'upsert';
                res.error = upErr.message || String(upErr);
            }

            results.push(res);
        }

        var allSuccess = results.every(function (r) { return r.success; });
        var statusCode = allSuccess ? 200 : ((createdCount + updatedCount + deletedCount) > 0 ? 207 : 400);

        response.setStatus(statusCode);
        response.setBody({
            success: allSuccess,
            object_config: objectConfigSysId,
            object_name: objectName || null,
            total_incoming: normalizedIncoming.length,
            created: createdCount,
            updated: updatedCount,
            deleted: deletedCount,
            delete_failed: deleteFailCount,
            message: allSuccess ?
                'Selected related objects updated successfully' :
                (createdCount + ' created, ' + updatedCount + ' updated, ' + deletedCount + ' deleted, ' + deleteFailCount + ' delete failed'),
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
