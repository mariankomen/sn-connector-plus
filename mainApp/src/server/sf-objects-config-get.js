(function process(request, response) {
    response.setContentType('application/json');
    
    try {
        var objectConfigGr = new GlideRecord('x_1955226_peeklo_1_salesforce_object_config');
        objectConfigGr.addQuery('active', true);
        objectConfigGr.orderBy('order');
        objectConfigGr.orderBy('sf_object_label');
        objectConfigGr.query();

        var objects = [];
        while (objectConfigGr.next()) {
            objects.push({
                sys_id: objectConfigGr.getValue('sys_id'),
                sf_object_name: objectConfigGr.getValue('sf_object_name'),
                sf_object_label: objectConfigGr.getValue('sf_object_label'),
                active: objectConfigGr.getValue('active') === '1',
                searchable: objectConfigGr.getValue('searchable') === '1',
                description: objectConfigGr.getValue('description'),
                order: parseInt(objectConfigGr.getValue('order')) || 100
            });
        }

        response.setStatus(200);
        response.setBody({
            success: true,
            count: objects.length,
            objects: objects
        });

    } catch (err) {
        response.setStatus(500);
        response.setBody({
            success: false,
            error: err.message || String(err)
        });
    }
})(request, response);

