const TaskSyncService = Class.create();
TaskSyncService.prototype = {
    initialize: function () {},

    getRecordFields: function (current) {
        const record = {};
        
        for (const fieldName in current) {
            if (fieldName === 'sys_class_name' || fieldName === 'sys_scope') {
                continue;
            }
            
            try {
                const fieldValue = current[fieldName];
                if (fieldValue) {
                    if (typeof fieldValue === 'object' && fieldValue.toString) {
                        record[fieldName] = fieldValue.toString();
                    } else {
                        record[fieldName] = fieldValue;
                    }
                }
            } catch (e) {
            }
        }
        
        if (!record.sys_id) {
            record.sys_id = current.sys_id ? current.sys_id.toString() : current.getUniqueValue();
        }
        
        return record;
    },

    handleTaskSync: function (eventType, current) {
        if (!current) {
            throw new Error('Current record is required');
        }

        const tableName = current.getTableName();
        const record = this.getRecordFields(current);

        return this.processTaskSyncEvent({
            eventType: eventType,
            tableName: tableName,
            record: record
        });
    },

    handleQueuedTaskSync: function (eventData) {
        if (!eventData) {
            gs.error('Task sync handler: eventData is null');
            return false;
        }
        if (!eventData.table) {
            gs.error('Task sync handler: eventData.table is missing');
            return false;
        }
        if (!eventData.record) {
            gs.error('Task sync handler: eventData.record is missing');
            return false;
        }

        return this.processTaskSyncEvent({
            eventType: eventData.eventType,
            tableName: eventData.table,
            record: eventData.record,
            connectionId: eventData.connectionId
        });
    },

    processTaskSyncEvent: function ({ eventType, tableName, record, connectionId }) {
        try {
            if (!tableName || !record) {
                gs.error('Task sync handler: missing table name or record data');
                return false;
            }

            const connectionService = new x_peekl_salesfor_0.SalesforceConnectionService();
            let resolvedConnectionId = connectionId;
            if (!resolvedConnectionId) {
                const connectionLookup = connectionService.getCurrentUserConnection();
                if (!connectionLookup || !connectionLookup.success) {
                    gs.error('Task sync handler: connection lookup failed - ' + (connectionLookup ? connectionLookup.error : 'connectionLookup is null'));
                    return false;
                }
                resolvedConnectionId = connectionLookup.connection_id;
            }

            const isConfigured = this._isTaskTypeConfigured(resolvedConnectionId, tableName);
            if (!isConfigured) {
                return false;
            }

            const connectionDetails = connectionService.getConnectionDetails(resolvedConnectionId);
            if (!connectionDetails || !connectionDetails.success) {
                gs.error('Task sync handler: failed to load connection details - ' + (connectionDetails ? connectionDetails.error : 'connectionDetails is null'));
                return false;
            }

            const connection = connectionDetails.connection;
            if (!connection || !connection.instance_url) {
                gs.error('Task sync handler: Salesforce instance URL is missing from the connection');
                return false;
            }

            if (!connection.access_token && !connection.refresh_token) {
                return false;
            }
            
            const oauthService = new x_peekl_salesfor_0.SalesforceOAuthService();
            const accessToken = oauthService.ensureValidAccessToken({
                connection: connection,
                connectionService: connectionService
            });
            if (!accessToken) {
                gs.error('Task sync handler: unable to obtain Salesforce access token');
                return false;
            }

            const instanceId = gs.getProperty('instance_id');

            const payload = {
                event: eventType,
                details: {
                    instanceId,
                    table: tableName,
                    record
                }
            };

            const webhookUrl = connection.instance_url + '/services/apexrest/pl_servicenow/servicenow/webhook';


            return this.sendToSalesforceWebhook(payload, accessToken, webhookUrl);
        } catch (error) {
            gs.error('Task sync handler error: ' + error.message + '\n' + error.stack);
            return false;
        }
    },

    sendToSalesforceWebhook: function (payload, accessToken, webhookUrl) {
        try {
            const request = new sn_ws.RESTMessageV2();
            request.setEndpoint(webhookUrl);
            request.setHttpMethod('POST');
            request.setRequestHeader('Content-Type', 'application/json');
            request.setRequestHeader('Authorization', 'Bearer ' + accessToken);

            const requestBody = JSON.stringify(payload);
            request.setRequestBody(requestBody);


            const response = request.execute();
            const statusCode = response.getStatusCode();

            if (statusCode >= 200 && statusCode < 300) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            gs.error('Task sync handler: error sending HTTP request - ' + error.message + '\n' + error.stack);
            return false;
        }
    },

    _isTaskTypeConfigured: function (connectionId, tableName) {
        try {
            if (!connectionId || !tableName) {
                return false;
            }

            var taskTypeConfigGr = new GlideRecordSecure('x_peekl_salesfor_0_task_type_config');
            taskTypeConfigGr.addQuery('connection_id', connectionId);
            taskTypeConfigGr.addQuery('table_name', tableName);
            taskTypeConfigGr.setLimit(1);
            taskTypeConfigGr.query();

            return taskTypeConfigGr.hasNext();
        } catch (error) {
            gs.error('Task sync handler: isTaskTypeConfigured error: ' + error.message);
            return false;
        }
    },
    isSyncEnabled: function (connectionId, tableName) {
        return this._isTaskTypeConfigured(connectionId, tableName);
    },
    isTableConfigured: function(tableName) {
        try {
            if (!tableName) return false;
            var gr = new GlideRecordSecure('x_peekl_salesfor_0_task_type_config');
            gr.addQuery('table_name', tableName);
            gr.setLimit(1);
            gr.query();
            return gr.hasNext();
        } catch (e) {
            gs.error('TaskSyncService.isTableConfigured error: ' + e.message);
            return false;
        }
    },
    type: 'TaskSyncService'
};

