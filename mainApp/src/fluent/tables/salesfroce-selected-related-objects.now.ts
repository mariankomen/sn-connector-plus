import '@servicenow/sdk/global'
import { Table, StringColumn, BooleanColumn, IntegerColumn, ReferenceColumn } from '@servicenow/sdk/core'

export const x_1955226_peeklo_1_salesforce_selected_related_objects = Table({
    name: 'x_1955226_peeklo_1_salesforce_selected_related_objects',
    label: 'Salesforce Selected Related Objects',
    schema: {
        object_config: ReferenceColumn({
            label: 'Object Configuration',
            referenceTable: 'x_1955226_peeklo_1_salesforce_object_config',
            referenceKey: 'sys_id',
            mandatory: true
        }),
        relationship_name: StringColumn({
            label: 'Relationship Name (API Name)',
            maxLength: 200,
            mandatory: true,
            display: true
        }),
        relationship_label: StringColumn({
            label: 'Relationship Label',
            maxLength: 200,
            mandatory: false
        }),
        active: BooleanColumn({
            label: 'Active',
            default: 'true'
        }),
        order: IntegerColumn({
            label: 'Display Order',
            default: '100'
        }),
    },
    actions: ['create', 'read', 'update', 'delete'],
    allow_web_service_access: true,
    accessible_from: 'public',
    caller_access: 'tracking'
})

