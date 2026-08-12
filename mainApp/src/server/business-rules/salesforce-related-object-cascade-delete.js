(function executeRule(current, previous) {
    var sysId = current.sys_id ? current.sys_id.toString() : current.getUniqueValue();
    if (!sysId) {
        gs.error('Salesforce object config cascade delete BR: unable to determine sys_id');
        return;
    }

    var queueService = new x_peekl_salesfor_0.SyncEventQueueService();
    var payload = {
        eventType: 'cascade_delete',
        parentTable: 'x_peekl_salesfor_0_salesforce_selected_related_objects',
        parentSysId: sysId,
        childTables: [
            'x_peekl_salesfor_0_salesforce_related_object_columns'
            
        ]
    };
    
    queueService.enqueuePayload(payload);
})(current, previous);

