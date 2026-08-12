
export const CONNECTOR_SP_PAGE_ID = 'peeklogic_salesforce_connector_plus'

export function getConnectorPortalUrl(): string {
    return `${window.location.origin}/sp?id=${CONNECTOR_SP_PAGE_ID}`
}
