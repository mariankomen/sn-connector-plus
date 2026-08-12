import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: Now.ID['salesforce-related-object-cascade-delete-rule'],
    name: 'Salesforce Realted Object Cascade Delete',
    table: 'x_peekl_salesfor_0_salesforce_selected_related_objects',
    action: ['delete'],
    when: 'before',
    active: true,
    order: 100,
    script: Now.include('../../server/business-rules/salesforce-related-object-cascade-delete.js'),
    description: 'Queues cascade delete operation for child records when a Salesforce related object is deleted'
})

