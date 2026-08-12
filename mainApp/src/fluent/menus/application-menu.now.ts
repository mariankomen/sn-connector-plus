import '@servicenow/sdk/global'
import { ApplicationMenu, Record } from '@servicenow/sdk/core'
import { salesforceIntegrationUserPaidRole } from '../security/roles.now'

export const peeklogicAppMenu = ApplicationMenu({
    $id: Now.ID['x_peekl_salesfor_0_app_menu'],
    title: 'Peeklogic Connector Plus',
    hint: 'Salesforce integration settings and support',
    description: 'Connect and configure Salesforce synchronization',
    active: true,
    order: 100,
    roles: [salesforceIntegrationUserPaidRole],

})

Record({
    $id: Now.ID['x_peekl_salesfor_0_app_module'],
    table: 'sys_app_module',
    data: {
        title: 'Salesforce Integration',
        application: peeklogicAppMenu,
        link_type: 'DIRECT',
        active: true,
        order: 100,
        query: '/sp?id=peeklogic_salesforce_connector_plus',
        window_name: '_blank'
    },
    roles: [salesforceIntegrationUserPaidRole]
})

Record({
    $id: Now.ID['x_peekl_salesfor_0_support_module'],
    table: 'sys_app_module',
    data: {
        title: 'Contact Support',
        application: peeklogicAppMenu,
        link_type: 'DIRECT',
        active: true,
        order: 110,
        query: '/sp?id=peeklogic_salesforce_connector_plus&tab=support',
        window_name: '_blank'
    },
    roles: [salesforceIntegrationUserPaidRole]
})

Record({
    $id: Now.ID['x_peekl_salesfor_0_privacy_module'],
    table: 'sys_app_module',
    data: {
        title: 'App Privacy Policy',
        application: peeklogicAppMenu,
        link_type: 'DIRECT',
        active: true,
        order: 120,
        query: '/sp?id=peeklogic_salesforce_connector_plus&tab=privacy',
        window_name: '_blank'
    },
    roles: [salesforceIntegrationUserPaidRole]
})