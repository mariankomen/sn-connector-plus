import '@servicenow/sdk/global'
import { Table, StringColumn, BooleanColumn, IntegerColumn } from '@servicenow/sdk/core'


export const x_peekl_salesfor_0_salesforce_object_config = Table({
    name: 'x_peekl_salesfor_0_salesforce_object_config',
    label: 'Salesforce Object Configuration',
    schema: {
        sf_object_name: StringColumn({
            label: 'Salesforce Object API Name',
            maxLength: 200,
            mandatory: true,
            display: true
        }),
        sf_object_label: StringColumn({
            label: 'Salesforce Object Label',
            maxLength: 200,
            mandatory: true
        }),
        active: BooleanColumn({
            label: 'Active',
            default: 'true'
        }),
        searchable: BooleanColumn({
            label: 'Searchable',
            default: 'true'
        }),
        description: StringColumn({
            label: 'Description',
            maxLength: 1000
        }),
        order: IntegerColumn({
            label: 'Display Order',
            default: '100'
        })
    },
    actions: ['create', 'read', 'update', 'delete'],
    allow_web_service_access: true,
    accessible_from: 'public',
    caller_access: 'tracking'
})

