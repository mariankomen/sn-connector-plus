import '@servicenow/sdk/global'
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: Now.ID['salesforce-object-config-cascade-delete-rule'],
    name: 'Salesforce Object Config Cascade Delete',
    table: 'x_1955226_peeklo_1_salesforce_object_config',
    action: ['delete'],
    when: 'before',
    active: true,
    order: 100,
    script: Now.include('../../server/business-rules/salesforce-object-config-cascade-delete.js'),
    description: 'Queues cascade delete operation for child records when a Salesforce object config is deleted'
})

