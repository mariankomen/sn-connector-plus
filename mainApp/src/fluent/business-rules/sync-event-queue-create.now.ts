import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: Now.ID['sync_event_queue_create_rule'],
    name: 'Sync Event Queue Create',
    table: 'x_peekl_salesfor_0_sync_event_queue',
    action: ['insert'],
    when: 'async',
    active: true,
    order: 100,
    script: Now.include('../../server/business-rules/sync-event-queue-create.js'),
    description: 'Processes queued sync events on insert'
})

