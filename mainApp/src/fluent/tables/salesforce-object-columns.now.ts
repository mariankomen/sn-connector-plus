import '@servicenow/sdk/global'
import { Table, StringColumn, BooleanColumn, IntegerColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const x_peekl_salesfor_0_salesforce_object_columns = Table({
    name: 'x_peekl_salesfor_0_salesforce_object_columns',
    label: 'Salesforce Object Columns',
    schema: {
        object_config: ReferenceColumn({
            label: 'Object Configuration',
            referenceTable: 'x_peekl_salesfor_0_salesforce_object_config',
            referenceKey: 'sys_id',
            mandatory: true,
        }),
        column_name: StringColumn({
            label: 'Column Name (API Name)',
            maxLength: 200,
            mandatory: true,
            display: true
        }),
        column_label: StringColumn({
            label: 'Column Label',
            maxLength: 200,
            mandatory: false
        }),
        order: IntegerColumn({
            label: 'Display Order',
            default: '100'
        }),
        active: BooleanColumn({
            label: 'Active',
            default: 'true'
        }),
    },
    actions: ['create', 'read', 'update', 'delete'],
    allow_web_service_access: true,
    accessible_from: 'public',
    caller_access: 'tracking'
})

