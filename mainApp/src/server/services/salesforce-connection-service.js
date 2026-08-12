const SalesforceConnectionService = Class.create();
SalesforceConnectionService.prototype = {
    initialize: function () {},

    getCurrentUserConnection: function () {
        try {
            const userId = gs.getUserID();
            const record = this._getLatestConnectionForUser(userId);
            if (record) {
                return {
                    success: true,
                    connection_id: record.getUniqueValue()
                };
            }

            return {
                success: false,
                error: 'No active connection found. Please connect to Salesforce first.'
            };
        } catch (error) {
            gs.error('SalesforceConnectionService.getCurrentUserConnection error: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },

    getConnectionById: function (connectionId) {
        try {
            const record = this._getConnectionRecord(connectionId, gs.getUserID());
            if (!record) {
                return {
                    success: false,
                    error: 'Connection not found'
                };
            }

            return {
                success: true,
                connection: {
                    sys_id: record.getUniqueValue(),
                    client_id: record.getValue('client_id'),
                    client_secret: record.getValue('client_secret'),
                    redirect_uri: record.getValue('redirect_uri'),
                    instance_url: record.getValue('instance_url')
                }
            };
        } catch (error) {
            gs.error('SalesforceConnectionService.getConnectionById error: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },

    getConnectionDetails: function (connectionId) {
        try {
            const record = this._getConnectionRecord(connectionId, gs.getUserID());
            if (!record) {
                return {
                    success: false,
                    error: 'Connection not found'
                };
            }

            return {
                success: true,
                connection: this._buildConnectionDetails(record)
            };
        } catch (error) {
            gs.error('SalesforceConnectionService.getConnectionDetails error: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },

    saveConnection: function (connectionData) {
        try {
            if (!connectionData.client_id || !connectionData.client_secret) {
                return {
                    success: false,
                    error: 'client_id and client_secret are required'
                };
            }

            const userId = gs.getUserID();
            const record = this._findOrCreateUserConnectionRecord(userId);
            const isNew = record.isNewRecord();

            record.setValue('client_id', connectionData.client_id);
            record.setValue('client_secret', connectionData.client_secret);
            record.setValue('redirect_uri', connectionData.redirect_uri || '');

            if (connectionData.instance_url || record.isNewRecord()) {
                record.setValue('instance_url', connectionData.instance_url || '');
            }

            if (connectionData.access_token !== undefined) {
                record.setValue('access_token', connectionData.access_token || '');
            }
            if (connectionData.refresh_token !== undefined) {
                record.setValue('refresh_token', connectionData.refresh_token || '');
            }
            if (connectionData.salesforce_user_id !== undefined) {
                record.setValue('salesforce_user_id', connectionData.salesforce_user_id || '');
            }
            if (connectionData.access_token_expires_at !== undefined) {
                record.setValue('access_token_expires_at', connectionData.access_token_expires_at || '');
            }

            if (isNew) {
                record.setValue('created_by', userId);
                const sysId = record.insert();
                return {
                    success: true,
                    connection_id: sysId
                };
            }

            record.update();
            return {
                success: true,
                connection_id: record.getUniqueValue()
            };
        } catch (error) {
            gs.error('SalesforceConnectionService.saveConnection error: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },

    disconnectCurrentUserConnection: function () {
        try {
            const userId = gs.getUserID();
            const record = this._getLatestConnectionForUser(userId);
            if (!record) {
                return {
                    success: false,
                    error: 'No connection to disconnect'
                };
            }

            const connectionId = record.getUniqueValue();

            this._deleteDependentRecords(connectionId);

            record.deleteRecord();

            return {
                success: true,
                connection_id: connectionId
            };
        } catch (error) {
            gs.error('SalesforceConnectionService.disconnectCurrentUserConnection error: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },

    _getConnectionRecord: function (connectionId, userId) {
        if (!connectionId) {
            return null;
        }

        var connectionGr = new GlideRecordSecure('x_peekl_salesfor_0_salesforce_connection');
        if (!connectionGr.get(connectionId)) {
            return null;
        }

        if (userId && connectionGr.getValue('created_by') !== userId) {
            return null;
        }

        return connectionGr;
    },

    _getLatestConnectionForUser: function (userId) {
        var connectionGr = new GlideRecordSecure('x_peekl_salesfor_0_salesforce_connection');
        connectionGr.addQuery('created_by', userId);
        connectionGr.orderByDesc('sys_created_on');
        connectionGr.setLimit(1);
        connectionGr.query();

        if (connectionGr.next()) {
            return connectionGr;
        }

        return null;
    },

    _deleteDependentRecords: function (connectionId) {
        var syncGr = new GlideRecordSecure('x_peekl_salesfor_0_sync_config');
        syncGr.addQuery('connection_ref', connectionId);
        syncGr.deleteMultiple();

        var taskGr = new GlideRecordSecure('x_peekl_salesfor_0_task_type_config');
        taskGr.addQuery('connection_id', connectionId);
        taskGr.deleteMultiple();
    },

    _findOrCreateUserConnectionRecord: function (userId) {
        const existing = this._getLatestConnectionForUser(userId);
        if (existing) {
            return existing;
        }

        var connectionGr = new GlideRecordSecure('x_peekl_salesfor_0_salesforce_connection');
        connectionGr.initialize();
        connectionGr.setValue('created_by', userId);
        return connectionGr;
    },

    _buildConnectionDetails: function (record) {
        return {
            sys_id: record.getUniqueValue(),
            client_id: record.client_id.getDecryptedValue(),
            client_secret: record.client_secret.getDecryptedValue(),
            redirect_uri: record.getValue('redirect_uri'),
            access_token: record.access_token.getDecryptedValue(),
            refresh_token: record.refresh_token.getDecryptedValue(),
            access_token_expires_at: record.getValue('access_token_expires_at'),
            salesforce_user_id: record.getValue('salesforce_user_id'),
            instance_url: record.getValue('instance_url')
        };
    },

    type: 'SalesforceConnectionService'
};
