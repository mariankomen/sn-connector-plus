(function process(request, response) {
    response.setContentType('application/json');
    
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
       
        var objectConfigSysId = getParam('object_config') || getParam('object_config_sys_id');
        var objectName = getParam('object_name') || getParam('sf_object_name');

        if (!objectConfigSysId && objectName) {
            var objConfigGr = new GlideRecord('x_1955226_peeklo_1_salesforce_object_config');
            objConfigGr.addQuery('sf_object_name', objectName);
            objConfigGr.query();
            if (objConfigGr.next()) {
                objectConfigSysId = objConfigGr.getUniqueValue();
            } else {
                response.setStatus(404);
                response.setBody({
                    success: false,
                    error: 'Object configuration not found for object_name: ' + objectName
                });
                return;
            }
        }

        if (!objectConfigSysId) {
            response.setStatus(400);
            response.setBody({
                success: false,
                error: 'Missing required parameter: object_config (sys_id) or object_name'
            });
            return;
        }

        var objectColumnGr = new GlideRecord('x_1955226_peeklo_1_salesforce_object_columns');
        objectColumnGr.addQuery('object_config', objectConfigSysId);
        objectColumnGr.orderBy('order');
        objectColumnGr.orderBy('column_label');
        objectColumnGr.orderBy('column_name');
        objectColumnGr.query();

        var columns = [];
        while (objectColumnGr.next()) {
            columns.push({
                sys_id: objectColumnGr.getUniqueValue(),
                object_config: objectColumnGr.getValue('object_config'),
                column_name: objectColumnGr.getValue('column_name'),
                column_label: objectColumnGr.getValue('column_label') || objectColumnGr.getValue('column_name'),
                active: objectColumnGr.getValue('active') === '1',
                order: parseInt(objectColumnGr.getValue('order')) || 100
            });
        }

        var objConfigGr = new GlideRecord('x_1955226_peeklo_1_salesforce_object_config');
        var objectConfig = null;
        if (objConfigGr.get(objectConfigSysId)) {
            objectConfig = {
                sys_id: objConfigGr.getUniqueValue(),
                sf_object_name: objConfigGr.getValue('sf_object_name'),
                sf_object_label: objConfigGr.getValue('sf_object_label'),
                active: objConfigGr.getValue('active') === '1'
            };
        }

        response.setStatus(200);
        response.setBody({
            success: true,
            object_config: objectConfig,
            count: columns.length,
            columns: columns
        });

    } catch (err) {
        response.setStatus(500);
        response.setBody({
            success: false,
            error: err.message || String(err)
        });
    }
})(request, response);

