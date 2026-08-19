import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: Now.ID['sync_event_queue_create_rule'],
    name: 'Sync Event Queue Create',
    table: 'x_1955226_peeklo_1_sync_event_queue',
    action: ['insert'],
    when: 'async',
    active: true,
    order: 100,
    script: Now.include('../../server/business-rules/sync-event-queue-create.js'),
    description: 'Processes queued sync events on insert'
})

