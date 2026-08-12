import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: Now.ID['task_sync_update_rule'],
    name: 'Task Sync Update',
    table: 'task',
    action: ['update'],
    when: 'async',
    active: true,
    order: 100,
    script: Now.include('../../server/business-rules/task-sync-update.js'),
    description: 'Handles task update sync to Salesforce',
    condition: 'new x_peekl_salesfor_0.TaskSyncService().isTableConfigured(current.getTableName())',
})

