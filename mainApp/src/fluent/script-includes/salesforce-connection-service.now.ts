import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['salesforce_connection_service_script_include'],
    name: 'SalesforceConnectionService',
    apiName: 'x_1955226_peeklo_1.SalesforceConnectionService',
    clientCallable: false,
    accessibleFrom: 'public',
    script: Now.include('../../server/services/salesforce-connection-service.js')
})

