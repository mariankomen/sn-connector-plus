(function executeRule(current, previous) {
    var sysId = current.sys_id ? current.sys_id.toString() : current.getUniqueValue();
    if (!sysId) {
        gs.error('Salesforce object config cascade delete BR: unable to determine sys_id');
        return;
    }

    var queueService = new x_1955226_peeklo_1.SyncEventQueueService();
    var payload = {
        eventType: 'cascade_delete',
        parentTable: 'x_1955226_peeklo_1_salesforce_selected_related_objects',
        parentSysId: sysId,
        childTables: [
            'x_1955226_peeklo_1_salesforce_related_object_columns'
            
        ]
    };
    
    queueService.enqueuePayload(payload);
})(current, previous);

