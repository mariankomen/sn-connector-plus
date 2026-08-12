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
        const body = request.body ? request.body.data : {};
        const taskTypesToSave = body.task_types || [];
        
        if (!Array.isArray(taskTypesToSave)) {
            response.setStatus(400);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'task_types must be an array'
            }));
            return;
        }
        
        const deleteGr = new GlideRecord('x_peekl_salesfor_0_task_type_config');
        deleteGr.addQuery('connection_id', connectionId);
        deleteGr.deleteMultiple();
        
        const results = [];
        const errors = [];
        
        for (let i = 0; i < taskTypesToSave.length; i++) {
            const taskType = taskTypesToSave[i];
            
            if (!taskType.table_name || !taskType.table_label) {
                errors.push('Task type at index ' + i + ' is missing required fields (table_name, table_label)');
                continue;
            }
            
            try {
                const newGr = new GlideRecord('x_peekl_salesfor_0_task_type_config');
                newGr.initialize();
                newGr.setValue('connection_id', connectionId);
                newGr.setValue('table_name', taskType.table_name);
                newGr.setValue('table_label', taskType.table_label);
                newGr.setValue('created_by', gs.getUserID());
                const sysId = newGr.insert();
                
                results.push({
                    sys_id: sysId,
                    table_name: taskType.table_name,
                    table_label: taskType.table_label
                });
            } catch (error) {
                errors.push('Error saving ' + taskType.table_name + ': ' + error.message);
            }
        }
        
        if (errors.length > 0) {
            response.setStatus(207);
            writer.writeString(JSON.stringify({
                success: false,
                results: results,
                errors: errors,
                message: 'Some task types could not be saved'
            }));
        } else {
            response.setStatus(200);
            writer.writeString(JSON.stringify({
                success: true,
                results: results,
                message: 'Task type configuration saved successfully'
            }));
        }
        
    } catch (error) {
        gs.error('Error in task type config PUT handler: ' + error.message + '\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + error.message
        }));
    }
    
})(request, response);
