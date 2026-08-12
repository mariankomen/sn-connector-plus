import '@servicenow/sdk/global'
import { Table, StringColumn, IntegerColumn } from '@servicenow/sdk/core'

export const x_peekl_salesfor_0_sync_event_queue = Table({
    name: 'x_peekl_salesfor_0_sync_event_queue',
    label: 'Sync Event Queue',
    schema: {
        payload: StringColumn({
            label: 'Payload',
            maxLength: 4000,
            mandatory: true
        }),
        status: StringColumn({
            label: 'Status',
            maxLength: 40,
            mandatory: true,
            defaultValue: 'pending'
        }),
        retries: IntegerColumn({
            label: 'Retries',
            mandatory: true,
            defaultValue: 0
        }),
        error_message: StringColumn({
            label: 'Error Message',
            maxLength: 1000
        })
    },
    actions: ['create', 'read', 'update', 'delete'],
    allow_web_service_access: false,
    accessible_from: 'public',
    caller_access: 'tracking'
})

