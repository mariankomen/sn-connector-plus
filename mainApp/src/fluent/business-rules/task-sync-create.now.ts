import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: Now.ID['task_sync_create_rule'],
    name: 'Task Sync Create',
    table: 'task',
    action: ['insert'],
    when: 'async',
    active: true,
    order: 100,
    script: Now.include('../../server/business-rules/task-sync-create.js'),
    description: 'Handles task creation sync to Salesforce',
    condition: 'new x_1955226_peeklo_1.TaskSyncService().isTableConfigured(current.getTableName())',
})

