import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['task_sync_service_script_include'],
    name: 'TaskSyncService',
    apiName: 'x_peekl_salesfor_0.TaskSyncService',
    clientCallable: false,
    accessibleFrom: 'public',
    script: Now.include('../../server/services/task-sync-service.js')
})

