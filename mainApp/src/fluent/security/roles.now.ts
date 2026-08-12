import '@servicenow/sdk/global'
import { Role } from '@servicenow/sdk/core'


export const salesforceIntegrationUserPaidRole = Role({
    $id: Now.ID['salesforce_integration_user_paid_role'],
    name: 'x_peekl_salesfor_0.salesforce_integration_user_paid',
    description: 'Peeklogic Salesforce Connector Plus — integration UI, REST API, and app data.',
    grantable: true,
})
