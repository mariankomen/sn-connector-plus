(function process(request, response) {
    response.setContentType('application/json');
    const writer = response.getStreamWriter();
    
    try {
        const connectionHelper = new x_peekl_salesfor_0.SalesforceConnectionService();
        const activeConnection = connectionHelper.getCurrentUserConnection();
        if (!activeConnection.success) {
            response.setStatus(401);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'No active connection found. Please connect to Salesforce first.'
            }));
            return;
        }
        
        const connectionId = activeConnection.connection_id;
        
        const configGr = new GlideRecord('x_peekl_salesfor_0_task_type_config');
        configGr.addQuery('connection_id', connectionId);
        configGr.orderBy('table_name');
        configGr.query();
        
        const taskTypes = [];
        while (configGr.next()) {
            taskTypes.push({
                sys_id: configGr.getUniqueValue(),
                table_name: configGr.getValue('table_name'),
                table_label: configGr.getValue('table_label'),
                created_on: configGr.getValue('sys_created_on')
            });
        }
        
        response.setStatus(200);
        writer.writeString(JSON.stringify({
            success: true,
            result: {
                task_types: taskTypes,
                connection_id: connectionId
            }
        }));
        
    } catch (error) {
        gs.error('Error in task type config GET handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + error.message
        }));
    }
    
})(request, response);
