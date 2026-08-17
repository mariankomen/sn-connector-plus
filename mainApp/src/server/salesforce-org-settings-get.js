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
        const servicenowTable = getParam('servicenow_table');
        if (!servicenowTable) {
            response.setStatus(400);
            writer.writeString(JSON.stringify({
                success: false,
                error: 'Missing required parameter: servicenow_table'
            }));
            return;
        }

        var instanceName = gs.getProperty('instance_name');
        const query = `
        SELECT Id FROM pl_servicenow__ServiceNow_Table__c
        WHERE pl_servicenow__ServiceNow_Instance__r.pl_servicenow__ServiceNow_Instance_Name__c = '${instanceName}'
        AND pl_servicenow__ServiceNow_Name__c = '${servicenowTable}'
        AND pl_servicenow__isChecked__c = true
        LIMIT 1
        `;
        const salesforceObjectService = new x_1955226_peeklo_1.SalesforceObjectService();
        const linkedRecordsList = salesforceObjectService.query(query);

        response.setStatus(200);
        writer.writeString(JSON.stringify({
            success: true,
            servicenowTable: servicenowTable,
            instanceName: instanceName,
            isSyncing: linkedRecordsList.length > 0
        }));
        

    } catch (err) {
        gs.error('Error in Salesforce record link GET handler: ' + err.message + '\nStack: ' + err.stack);
        response.setStatus(500);
        writer.writeString(JSON.stringify({
            success: false,
            error: 'Internal server error: ' + (err.message || String(err))
        }));
    }
})(request, response);

