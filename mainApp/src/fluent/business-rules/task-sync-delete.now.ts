import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: Now.ID['task_sync_delete_rule'],
    name: 'Task Sync Delete',
    table: 'task',
    action: ['delete'],
    when: 'before',
    active: true,
    order: 100,
    script: Now.include('../../server/business-rules/task-sync-delete.js'),
    description: 'Handles task deletion sync to Salesforce',
    condition: 'new x_peekl_salesfor_0.TaskSyncService().isTableConfigured(current.getTableName())',
})

