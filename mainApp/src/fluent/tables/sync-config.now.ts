import '@servicenow/sdk/global'
import { Table, StringColumn, BooleanColumn, ReferenceColumn } from '@servicenow/sdk/core'


export const x_1955226_peeklo_1_sync_config = Table({
    name: 'x_1955226_peeklo_1_sync_config',
    label: 'Sync Configuration',
    schema: {
        connection_ref: ReferenceColumn({
            label: 'Salesforce Connection',
            referenceTable: 'x_1955226_peeklo_1_salesforce_connection',
            mandatory: true
        }),
        organization: StringColumn({
            label: 'Organization',
            maxLength: 255,
            mandatory: true
        }),
        project: StringColumn({
            label: 'Project', 
            maxLength: 255,
            mandatory: true
        }),
        work_item_types: StringColumn({
            label: 'Work Item Types',
            maxLength: 1000,
            mandatory: true
        }),
        is_active: BooleanColumn({
            label: 'Active',
            default: 'true'
        }),
        sync_create: BooleanColumn({
            label: 'Sync on Create',
            default: 'true'
        }),
        sync_update: BooleanColumn({
            label: 'Sync on Update', 
            default: 'true'
        }),
        sync_delete: BooleanColumn({
            label: 'Sync on Delete',
            default: 'true'
        })
    },
    actions: ['create', 'read', 'update', 'delete'],
    allow_web_service_access: true,
    accessible_from: 'public',
    caller_access: 'tracking'
})