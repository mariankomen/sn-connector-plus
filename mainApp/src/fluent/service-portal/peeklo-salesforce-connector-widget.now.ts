import '@servicenow/sdk/global'
import { SPWidget } from '@servicenow/sdk/core'
import { salesforceIntegrationUserPaidRole } from '../security/roles.now'

const widgetTemplate = `<div class="x-peekl-salesfor-0-salesforce-integration">
  <div id="root"></div>
</div>`

export const peeklo_salesforce_connector_widget = SPWidget({
    $id: Now.ID['peeklo-salesforce-connector-widget'],
    name: 'Peeklogic Salesforce Connector',
    id: 'x_peekl_salesfor_0_salesforce_integration',
    category: 'custom',
    description:
        'Hosts the Peeklogic Salesforce Integration React UI inside Service Portal. sp_page ID must match the app (see connector portal URL in source) so /sp?id=... and OAuth return URLs resolve.',
    htmlTemplate: widgetTemplate,
    serverScript: Now.include('../../server/sp-widgets/peeklo-salesforce-connector-sp-server.js'),
    clientScript: Now.include('../../server/sp-widgets/peeklo-salesforce-connector-sp-client.js'),
    controllerAs: 'c',
    roles: [salesforceIntegrationUserPaidRole],
    public: false,
})
