(function process(request, response) {
    response.setContentType('application/json');
    
    try {
        var body = request.body;
        var data;
        var isBatch = false;
        
        
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }
        
        
        if (Array.isArray(body)) {
            data = body;
            isBatch = true;
        } else if (body.data) {
            
            if (Array.isArray(body.data)) {
                data = body.data;
                isBatch = true;
            } else {
                data = [body.data];
            }
        } else if (body.sf_object_name) {
            
            data = [body];
        } else if (body.objects && Array.isArray(body.objects)) {
            
            data = body.objects;
            isBatch = true;
        } else {
            data = [body];
        }

        
        if (!data || !Array.isArray(data) || data.length === 0) {
            response.setStatus(400);
            response.setBody({
                success: false,
                error: 'No valid data provided',
                received_body: body
            });
            return;
        }

        
        var results = [];
        var successCount = 0;
        var failCount = 0;

        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var result = {
                index: i,
                sf_object_name: item.sf_object_name
            };

            
            if (!item || !item.sf_object_name || !item.sf_object_label) {
                result.success = false;
                result.error = 'Missing required fields: sf_object_name and sf_object_label';
                failCount++;
                results.push(result);
                continue;
            }

            
            var checkobjectConfigGr = new GlideRecord('x_1955226_peeklo_1_salesforce_object_config');
            checkobjectConfigGr.addQuery('sf_object_name', item.sf_object_name);
            checkobjectConfigGr.query();

            if (checkobjectConfigGr.next()) {
                result.success = false;
                result.error = 'Object already configured: ' + item.sf_object_name;
                failCount++;
                results.push(result);
                continue;
            }

            
            try {
                var objectConfigGr = new GlideRecord('x_1955226_peeklo_1_salesforce_object_config');
                objectConfigGr.initialize();
                objectConfigGr.setValue('sf_object_name', item.sf_object_name);
                objectConfigGr.setValue('sf_object_label', item.sf_object_label);
                objectConfigGr.setValue('active', item.active !== undefined ? item.active : true);
                objectConfigGr.setValue('searchable', item.searchable !== undefined ? item.searchable : true);
                
                if (item.description) {
                    objectConfigGr.setValue('description', item.description);
                }
                
                if (item.order !== undefined) {
                    objectConfigGr.setValue('order', item.order);
                }

                var sysId = objectConfigGr.insert();

                if (!sysId) {
                    result.success = false;
                    result.error = 'Failed to create object configuration';
                    failCount++;
                } else {
                    result.success = true;
                    result.sys_id = sysId;
                    result.object = {
                        sys_id: sysId,
                        sf_object_name: item.sf_object_name,
                        sf_object_label: item.sf_object_label,
                        active: item.active !== undefined ? item.active : true,
                        searchable: item.searchable !== undefined ? item.searchable : true,
                        description: item.description || '',
                        order: item.order || 100
                    };
                    successCount++;
                }
            } catch (itemErr) {
                result.success = false;
                result.error = itemErr.message || String(itemErr);
                failCount++;
            }

            results.push(result);
        }

        var allSuccess = failCount === 0;
        var statusCode = allSuccess ? 201 : (successCount > 0 ? 207 : 400);

        response.setStatus(statusCode);
        response.setBody({
            success: allSuccess,
            batch: isBatch,
            total: data.length,
            succeeded: successCount,
            failed: failCount,
            message: allSuccess ? 
                (isBatch ? successCount + ' objects added successfully' : 'Object added successfully') :
                (successCount + ' succeeded, ' + failCount + ' failed'),
            results: results
        });

    } catch (err) {
        response.setStatus(500);
        response.setBody({
            success: false,
            error: err.message || String(err)
        });
    }
})(request, response);



