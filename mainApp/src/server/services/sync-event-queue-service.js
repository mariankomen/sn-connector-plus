var SyncEventQueueService = Class.create();
SyncEventQueueService.prototype = {
    initialize: function () {},

    _isAllowedCascadeChildTable: function (tableName) {
        if (!tableName || typeof tableName !== 'string') {
            return false;
        }
        var allowed = {
            'x_peekl_salesfor_0_salesforce_object_columns': true,
            'x_peekl_salesfor_0_salesforce_selected_related_objects': true,
            'x_peekl_salesfor_0_salesforce_related_object_columns': true
        };
        return !!allowed[tableName];
    },

    processCreate: function (current) {
        return this._process(current, { skipStatusCheck: true });
    },

    enqueuePayload: function (payloadObj) {
        if (!payloadObj) {
            return null;
        }
        var queueGr = new GlideRecordSecure('x_peekl_salesfor_0_sync_event_queue');
        queueGr.initialize();
        queueGr.setValue('payload', JSON.stringify(payloadObj));
        queueGr.setValue('status', 'pending');
        queueGr.setValue('retries', 0);
        queueGr.setValue('error_message', '');
        return queueGr.insert();
    },

    processRetry: function (current) {
        const status = current.getValue('status');
        const retries = parseInt(current.getValue('retries'), 10) || 0;

        if (status !== 'failed') {
            return false;
        }
        if (retries >= 5) {
            return false;
        }

        return this._process(current, { allowRetryIncrement: true });
    },

    _process: function (current, options) {
        if (!current) {
            return false;
        }

        const payloadText = current.getValue('payload');
        if (!payloadText) {
            this._updateQueue(current, {
                status: 'failed',
                error_message: 'Payload is empty',
                incrementRetry: options && options.allowRetryIncrement
            });
            return false;
        }

        let eventData;
        try {
            eventData = JSON.parse(payloadText);
        } catch (err) {
            this._updateQueue(current, {
                status: 'failed',
                error_message: 'Invalid payload JSON',
                incrementRetry: options && options.allowRetryIncrement
            });
            return false;
        }

        const eventType = eventData.eventType || 'task_sync';
        let success = false;

        try {
            if (eventType === 'cascade_delete') {
                success = this._handleCascadeDelete(eventData);
            } else {
                const taskSyncService = new x_peekl_salesfor_0.TaskSyncService();
                success = taskSyncService.handleQueuedTaskSync(eventData);
            }
        } catch (err) {
            this._updateQueue(current, {
                status: 'failed',
                error_message: err.message,
                incrementRetry: options && options.allowRetryIncrement
            });
            return false;
        }

        if (success) {
            this._updateQueue(current, { status: 'success' });
            return true;
        }

        this._updateQueue(current, {
            status: 'failed',
            error_message: eventType === 'cascade_delete' ? 'Cascade delete failed' : 'Sync failed',
            incrementRetry: options && options.allowRetryIncrement
        });
        return false;
    },

    _handleCascadeDelete: function (eventData) {
        if (!eventData.parentSysId || !eventData.childTables || !Array.isArray(eventData.childTables)) {
            gs.error('SyncEventQueueService: Invalid cascade delete payload');
            return false;
        }

        const parentTable = eventData.parentTable || '';
        const parentSysId = eventData.parentSysId;
        const childTables = eventData.childTables;
        let allSuccess = true;
        let totalDeleted = 0;

        var selectedRelatedObjectsTable = 'x_peekl_salesfor_0_salesforce_selected_related_objects';
        var relatedObjectColumnsTable = 'x_peekl_salesfor_0_salesforce_related_object_columns';
        var objectConfigTable = 'x_peekl_salesfor_0_salesforce_object_config';

        
        if (parentTable === objectConfigTable && childTables.indexOf(selectedRelatedObjectsTable) !== -1) {
            try {
                var selectedRelatedObjectsGR = new GlideRecordSecure('x_peekl_salesfor_0_salesforce_selected_related_objects');
                selectedRelatedObjectsGR.addQuery('object_config', parentSysId);
                selectedRelatedObjectsGR.query();
                
                var selectedRelatedObjectSysIds = [];
                while (selectedRelatedObjectsGR.next()) {
                    selectedRelatedObjectSysIds.push(selectedRelatedObjectsGR.sys_id.toString());
                }

                if (selectedRelatedObjectSysIds.length > 0) {
                    var deletedGrandchildren = this._deleteChildRecords(relatedObjectColumnsTable, 'selected_related_object', selectedRelatedObjectSysIds);
                    
                    if (deletedGrandchildren > 0) {
                        gs.info('SyncEventQueueService: Deleted ' + deletedGrandchildren + ' grandchild record(s) from ' + relatedObjectColumnsTable);
                        totalDeleted += deletedGrandchildren;
                    }
                }
            } catch (err) {
                gs.error('SyncEventQueueService: Failed to delete grandchild records from ' + relatedObjectColumnsTable + ': ' + err.message);
                allSuccess = false;
            }
        }

        
        for (var i = 0; i < childTables.length; i++) {
            var childTable = childTables[i];
            if (!this._isAllowedCascadeChildTable(childTable)) {
                gs.error('SyncEventQueueService: Rejected disallowed cascade child table: ' + childTable);
                allSuccess = false;
                continue;
            }
            try {
                var referenceField;
                
                
                if (parentTable === objectConfigTable) {
                    
                    referenceField = 'object_config';
                } else if (parentTable === selectedRelatedObjectsTable) {
                    
                    referenceField = 'selected_related_object';
                } else {
                    
                    referenceField = 'object_config';
                }
                
                var deletedCount = this._deleteChildRecords(childTable, referenceField, parentSysId);
                totalDeleted += deletedCount;
                if (deletedCount > 0) {
                    gs.info('SyncEventQueueService: Deleted ' + deletedCount + ' child record(s) from ' + childTable);
                }
            } catch (err) {
                gs.error('SyncEventQueueService: Failed to delete child records from ' + childTable + ': ' + err.message);
                allSuccess = false;
            }
        }

        if (totalDeleted > 0) {
            gs.info('SyncEventQueueService: Cascade delete completed - deleted ' + totalDeleted + ' total record(s)');
        }

        return allSuccess;
    },

    _deleteChildRecords: function (childTable, referenceField, parentSysId) {
        if (!this._isAllowedCascadeChildTable(childTable)) {
            gs.error('SyncEventQueueService: Rejected disallowed child table in _deleteChildRecords: ' + childTable);
            return 0;
        }
        var childGR = new GlideRecordSecure(childTable);
        
        if (Array.isArray(parentSysId)) {
            if (parentSysId.length === 0) {
                return 0;
            }
            childGR.addQuery(referenceField, 'IN', parentSysId.join(','));
        } else {
            childGR.addQuery(referenceField, parentSysId);
        }
        
        childGR.query();
        var sysIds = [];
        while (childGR.next()) {
            sysIds.push(childGR.sys_id.toString());
        }
        
        if (sysIds.length === 0) {
            return 0;
        }
        
        childGR = new GlideRecordSecure(childTable);
        if (Array.isArray(parentSysId)) {
            childGR.addQuery(referenceField, 'IN', parentSysId.join(','));
        } else {
            childGR.addQuery(referenceField, parentSysId);
        }
        childGR.setWorkflow(false);
        
        var reportedCount = 0;
        try {
            reportedCount = childGR.deleteMultiple() || 0;
        } catch (err) {
            var errorMsg = err.message || err.toString();
            
            if (errorMsg.indexOf('DeleteRecoveryManager') !== -1 || errorMsg.indexOf('booleanValue') !== -1) {
                gs.warn('[Peeklo] DeleteRecoveryManager error for ' + childTable + ' (this is a known platform issue - verifying deletion)');
                
                var verifyGR = new GlideRecordSecure(childTable);
                if (Array.isArray(parentSysId)) {
                    verifyGR.addQuery(referenceField, 'IN', parentSysId.join(','));
                } else {
                    verifyGR.addQuery(referenceField, parentSysId);
                }
                verifyGR.query();
                
                var remainingCount = 0;
                while (verifyGR.next()) {
                    remainingCount++;
                }
                
                var actuallyDeleted = sysIds.length - remainingCount;
                if (actuallyDeleted > 0) {
                    gs.info('[Peeklo] Verified: ' + actuallyDeleted + ' record(s) were actually deleted from ' + childTable + ' despite DeleteRecoveryManager error');
                    return actuallyDeleted;
                } else {
                    gs.error('[Peeklo] DeleteRecoveryManager error: No records were deleted from ' + childTable);
                    return 0;
                }
            } else {
                
                gs.error('SyncEventQueueService: deleteMultiple() failed for ' + childTable + ': ' + errorMsg);
                return 0;
            }
        }
        
        return reportedCount;
    },

    _updateQueue: function (current, updates) {
        var queueGr = new GlideRecordSecure('x_peekl_salesfor_0_sync_event_queue');
        if (!queueGr.get('sys_id', current.getUniqueValue())) {
            return;
        }
        if (updates.status) {
            queueGr.setValue('status', updates.status);
        }
        if (updates.error_message) {
            queueGr.setValue('error_message', updates.error_message);
        }
        if (updates.incrementRetry) {
            var retries = parseInt(queueGr.getValue('retries'), 10) || 0;
            queueGr.setValue('retries', retries + 1);
        }

        queueGr.update();
    },

    type: 'SyncEventQueueService'
};

