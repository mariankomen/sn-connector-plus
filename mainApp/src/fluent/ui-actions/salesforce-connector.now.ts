import '@servicenow/sdk/global'
import { UiAction } from '@servicenow/sdk/core'
import { salesforceIntegrationUserPaidRole } from '../security/roles.now'

UiAction({
    $id: Now.ID['salesforce_connector_ui_action'],
    name: 'Salesforce Connector',
    table: 'task',
    actionName: 'salesforce_connector',
    active: true,
    showInsert: false,
    showUpdate: true,
    hint: 'Open the Salesforce Connector panel to link, search, or create related Salesforce records',
    order: 100,
    roles: [salesforceIntegrationUserPaidRole],
    form: {
        showButton: true,
        style: 'unstyled',
    },
    client: {
        isClient: true,
        isUi11Compatible: true,
        isUi16Compatible: true,
        onClick: 'openReactModal()',
    },
    script: `function openReactModal() {
    if (g_form.isNewRecord()) return false;
    var m = new GlideModal('x_1955226_peeklo_1_ServiceNowPage');
    m.setTitle('Peeklogic Connector Plus');
    m.setWidth(1200);
    m.setPreference('sysparm_sys_id', g_form.getUniqueValue());
    m.setPreference('sysparm_table', g_form.getTableName());
    m.render();
    return false;
}`,
})