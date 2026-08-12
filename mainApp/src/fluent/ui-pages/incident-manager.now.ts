import '@servicenow/sdk/global'
import { Acl, UiPage } from '@servicenow/sdk/core'
import { salesforceIntegrationUserPaidRole } from '../security/roles.now'

const aclRoles = [salesforceIntegrationUserPaidRole]

Acl({
    $id: Now.ID['incident_manager_ui_page_read_acl'],
    type: 'ui_page',
    name: 'incident_manager',
    operation: 'read',
    roles: aclRoles,
})

Acl({
    $id: Now.ID['incident_manager_ui_page_execute_acl'],
    type: 'ui_page',
    name: 'incident_manager',
    operation: 'execute',
    roles: aclRoles,
})

Acl({
    $id: Now.ID['incident_manager_scoped_ui_page_read_acl'],
    type: 'ui_page',
    name: 'x_peekl_salesfor_0_incident_manager',
    operation: 'read',
    roles: aclRoles,
})

Acl({
    $id: Now.ID['incident_manager_scoped_ui_page_execute_acl'],
    type: 'ui_page',
    name: 'x_peekl_salesfor_0_incident_manager',
    operation: 'execute',
    roles: aclRoles,
})

Acl({
    $id: Now.ID['incident_manager_endpoint_ui_page_read_acl'],
    type: 'ui_page',
    name: 'x_peekl_salesfor_0_incident_manager.do',
    operation: 'read',
    roles: aclRoles,
})

Acl({
    $id: Now.ID['incident_manager_endpoint_ui_page_execute_acl'],
    type: 'ui_page',
    name: 'x_peekl_salesfor_0_incident_manager.do',
    operation: 'execute',
    roles: aclRoles,
})

Acl({
    $id: Now.ID['servicenow_page_ui_page_read_acl'],
    type: 'ui_page',
    name: 'x_peekl_salesfor_0_ServiceNowPage',
    operation: 'read',
    roles: aclRoles,
})

Acl({
    $id: Now.ID['servicenow_page_ui_page_execute_acl'],
    type: 'ui_page',
    name: 'x_peekl_salesfor_0_ServiceNowPage',
    operation: 'execute',
    roles: aclRoles,
})

Acl({
    $id: Now.ID['servicenow_page_endpoint_ui_page_read_acl'],
    type: 'ui_page',
    name: 'x_peekl_salesfor_0_ServiceNowPage.do',
    operation: 'read',
    roles: aclRoles,
})

Acl({
    $id: Now.ID['servicenow_page_endpoint_ui_page_execute_acl'],
    type: 'ui_page',
    name: 'x_peekl_salesfor_0_ServiceNowPage.do',
    operation: 'execute',
    roles: aclRoles,
})

UiPage({
    $id: Now.ID['servicenow-page'],
    endpoint: 'x_peekl_salesfor_0_ServiceNowPage.do',
    description: 'Host page for the Salesforce Connector React modal, opened via GlideModal from the Salesforce Connector UI Action on task',
    html: `<div data-peeklo-modal-root="true">Loading…</div>`,
    clientScript: `(function () {
    const API_BASE_URL = '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio';

    function mountIfReady() {
        var root = document.querySelector('[data-peeklo-modal-root="true"]');
        if (!root) throw new Error('root not found');
        if (!window.PeekloModal || typeof window.PeekloModal.mount !== 'function') {
            throw new Error('PeekloModal.mount not found on window');
        }
        window.PeekloModal.mount(root);
    }

    function injectBundle() {
        if (window.__peeklo_bundle_injected) {
            mountIfReady();
            return;
        }
        window.__peeklo_bundle_injected = true;

        fetch(API_BASE_URL + '/modal/bundle?v=' + Date.now(), {
            method: 'GET',
            headers: {
                'X-UserToken': window.g_ck || ''
            },
            credentials: 'same-origin'
        })
        .then(function(response) { return response.text(); })
        .then(function(scriptContent) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.textContent = scriptContent;
            document.head.appendChild(script);
            try {
                mountIfReady();
            } catch(e) {
                console.error('[PEEKLO] mount failed:', e);
                var root = document.querySelector('[data-peeklo-modal-root="true"]');
                if (root) root.textContent = 'Mount failed: ' + (e && e.message ? e.message : e);
            }
        })
        .catch(function(err) {
            console.error('[PEEKLO] FAILED to load bundle:', err);
            var root = document.querySelector('[data-peeklo-modal-root="true"]');
            if (root) root.textContent = 'Bundle failed to load';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBundle);
    } else {
        injectBundle();
    }
})();`,
})