import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: Now.ID['sync_event_queue_retry_rule'],
    name: 'Sync Event Queue Retry',
    table: 'x_1955226_peeklo_1_sync_event_queue',
    action: ['update'],
    when: 'async',
    active: true,
    order: 110,
    script: Now.include('../../server/business-rules/sync-event-queue-retry.js'),
    description: 'Retries failed sync events up to 5 times'
})

