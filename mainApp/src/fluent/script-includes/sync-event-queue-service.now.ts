import '@servicenow/sdk/global'
import { ScriptInclude } from '@servicenow/sdk/core'

ScriptInclude({
    $id: Now.ID['sync_event_queue_service_script_include'],
    name: 'SyncEventQueueService',
    apiName: 'x_1955226_peeklo_1.SyncEventQueueService',
    clientCallable: false,
    accessibleFrom: 'public',
    script: Now.include('../../server/services/sync-event-queue-service.js')
})

