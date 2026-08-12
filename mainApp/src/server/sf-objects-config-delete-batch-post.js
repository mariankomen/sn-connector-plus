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
        } else if (body.sys_id || body.sf_object_name) {
            
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
                error: 'No valid data provided. Expected array of objects with sys_id or sf_object_name'
            });
            return;
        }

        
        var results = [];
        var successCount = 0;
        var failCount = 0;

        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var result = {
                index: i
            };

            
            var sysId = item.sys_id;
            var objectName = item.sf_object_name;

            if (!sysId && !objectName) {
                result.success = false;
                result.error = 'Missing required field: sys_id or sf_object_name';
                result.sys_id = sysId || null;
                result.sf_object_name = objectName || null;
                failCount++;
                results.push(result);
                continue;
            }

            
            var objectConfigGr = new GlideRecordSecure('x_peekl_salesfor_0_salesforce_object_config');
            var found = false;

            if (sysId) {
                objectConfigGr.addQuery('sys_id', sysId);
                objectConfigGr.query();
                found = objectConfigGr.next();
                result.sys_id = sysId;
            }

            if (!found && objectName) {
                objectConfigGr = new GlideRecordSecure('x_peekl_salesfor_0_salesforce_object_config');
                objectConfigGr.addQuery('sf_object_name', objectName);
                objectConfigGr.query();
                found = objectConfigGr.next();
                result.sf_object_name = objectName;
            }

            if (!found) {
                result.success = false;
                result.error = 'Object configuration not found';
                failCount++;
                results.push(result);
                continue;
            }

            
            var deletedObjectName = objectConfigGr.getValue('sf_object_name');
            var deletedSysId = objectConfigGr.getValue('sys_id');

            
            try {
                objectConfigGr.deleteRecord();
                result.success = true;
                result.sys_id = deletedSysId;
                result.sf_object_name = deletedObjectName;
                result.message = 'Object removed successfully';
                successCount++;
            } catch (deleteErr) {
                result.success = false;
                result.error = deleteErr.message || String(deleteErr);
                failCount++;
            }

            results.push(result);
        }

        
        var allSuccess = failCount === 0;
        var statusCode = allSuccess ? 200 : (successCount > 0 ? 207 : 400); 

        response.setStatus(statusCode);
        response.setBody({
            success: allSuccess,
            batch: isBatch,
            total: data.length,
            succeeded: successCount,
            failed: failCount,
            message: allSuccess ? 
                (isBatch ? successCount + ' objects removed successfully' : 'Object removed successfully') :
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

