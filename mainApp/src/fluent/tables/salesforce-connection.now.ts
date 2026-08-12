import '@servicenow/sdk/global'
import { Table, StringColumn, DateTimeColumn, Password2Column } from '@servicenow/sdk/core'

export const x_peekl_salesfor_0_salesforce_connection = Table({
    name: 'x_peekl_salesfor_0_salesforce_connection',
    label: 'Salesforce Connection',
    schema: {
        client_id: Password2Column({
            label: 'Client ID',
            maxLength: 255,
            mandatory: true
        }),
        client_secret: Password2Column({
            label: 'Client Secret',
            maxLength: 255,
            mandatory: true,
        }),
        access_token: Password2Column({
            label: 'Access Token',
            maxLength: 1000,
        }),
        refresh_token: Password2Column({
            label: 'Refresh Token',
            maxLength: 1000,
        }),
        redirect_uri: StringColumn({
            label: 'Redirect URI',
            maxLength: 500
        }),
        salesforce_user_id: StringColumn({
            label: 'Salesforce User ID',
            maxLength: 255
        }),
        instance_url: StringColumn({
            label: 'Salesforce Instance URL',
            maxLength: 500
        }),
        created_by: StringColumn({
            label: 'Created By',
            maxLength: 40
        }),
        access_token_expires_at: DateTimeColumn({
            label: 'Access Token Expires At'
        })
    },
    actions: ['create', 'read', 'update', 'delete'],
    allow_web_service_access: true,
    accessible_from: 'public',
    caller_access: 'tracking'
})