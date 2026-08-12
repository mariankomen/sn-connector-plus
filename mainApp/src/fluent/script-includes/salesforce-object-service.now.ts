import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['salesforce_object_service_script_include'],
    name: 'SalesforceObjectService',
    apiName: 'x_peekl_salesfor_0.SalesforceObjectService',
    clientCallable: false,
    accessibleFrom: 'public',
    script: Now.include('../../server/services/salesforce-object-service.js')
})

