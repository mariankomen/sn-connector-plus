import '@servicenow/sdk/global'
import { Table, StringColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const x_1955226_peeklo_1_task_type_config = Table({
    name: 'x_1955226_peeklo_1_task_type_config',
    label: 'Task Type Configuration',
    schema: {
        connection_ref: ReferenceColumn({
            label: 'Salesforce Connection',
            referenceTable: 'x_1955226_peeklo_1_salesforce_connection',
            mandatory: true
        }),
        connection_id: StringColumn({
            label: 'Connection ID',
            maxLength: 100,
            mandatory: true
        }),
        table_name: StringColumn({
            label: 'Task Table Name',
            maxLength: 100,
            mandatory: true
        }),
        table_label: StringColumn({
            label: 'Task Table Label', 
            maxLength: 255,
            mandatory: true
        })
    },
    actions: ['create', 'read', 'update', 'delete'],
    allow_web_service_access: true,
    accessible_from: 'public',
    caller_access: 'tracking'
})