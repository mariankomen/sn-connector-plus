import React from 'react';
import '../app.css';
import './SupportTab.css';

export default function PrivacyPolicyTab() {
    return (
        <div className="support-tab">
            <div className="support-header">
                <h2>🔒 App Privacy Policy</h2>
                <p>How the Peeklogic ServiceNow Connector handles your data.</p>
            </div>

            <div className="support-section">
                <h3>Overview</h3>
                <p className="support-description">
                    This application connects your ServiceNow instance to your own Salesforce organization,
                    enabling synchronization of task records (such as Incidents) between the two systems.
                    All data exchanged by this application flows directly between your ServiceNow instance
                    and your Salesforce organization. Peeklogic does not operate any intermediary servers,
                    and Peeklogic does not have access to your data, your ServiceNow instance, or your
                    Salesforce organization.
                </p>
            </div>

            <div className="support-section">
                <h3>What Data Is Collected</h3>
                <p className="support-description">
                    The application stores the following information within your ServiceNow instance, in
                    custom tables created and owned by this application:
                </p>
                <div className="support-checklist">
                    <div className="checklist-item">
                        <div className="checklist-icon">✓</div>
                        <div className="checklist-content">
                            <strong>Salesforce OAuth Credentials</strong>
                            <div className="checklist-value">
                                Client ID, Client Secret, Access Token, and Refresh Token for the Salesforce
                                connection you configure. These are stored using ServiceNow&#x2019;s built-in
                                two-way encryption (Password2 field type) and are never displayed in plain
                                text in the user interface.
                            </div>
                        </div>
                    </div>
                    <div className="checklist-item">
                        <div className="checklist-icon">✓</div>
                        <div className="checklist-content">
                            <strong>Sync Configuration</strong>
                            <div className="checklist-value">
                                Which ServiceNow tables (e.g. Incident) are configured to sync, and related
                                mapping/configuration settings you define.
                            </div>
                        </div>
                    </div>
                    <div className="checklist-item">
                        <div className="checklist-icon">✓</div>
                        <div className="checklist-content">
                            <strong>Sync Event Queue</strong>
                            <div className="checklist-value">
                                A short-lived operational log of sync events (status, retry count, error
                                messages) used to ensure reliable delivery of updates to Salesforce.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="support-section">
                <h3>How Data Is Used</h3>
                <p className="support-description">
                    The stored OAuth credentials are used solely to authenticate with your Salesforce
                    organization on your behalf, in order to send task record data (such as Incident fields)
                    from your ServiceNow instance to your Salesforce organization, as configured by you.
                    Task record data is transmitted directly to your Salesforce organization and is not
                    permanently stored by this application beyond the operational sync queue described above.
                </p>
            </div>

            <div className="support-section">
                <h3>Where Data Is Transferred and Stored</h3>
                <div className="support-checklist">
                    <div className="checklist-item">
                        <div className="checklist-icon">✓</div>
                        <div className="checklist-content">
                            <strong>Storage Location</strong>
                            <div className="checklist-value">
                                All application data is stored within your own ServiceNow instance. No data
                                is stored on servers operated by Peeklogic or any third party.
                            </div>
                        </div>
                    </div>
                    <div className="checklist-item">
                        <div className="checklist-icon">✓</div>
                        <div className="checklist-content">
                            <strong>Data Transfer Destination</strong>
                            <div className="checklist-value">
                                Task record data is transferred only to the Salesforce organization that you
                                connect using your own Salesforce credentials. You control which Salesforce
                                org is connected and can disconnect at any time.
                            </div>
                        </div>
                    </div>
                    <div className="checklist-item">
                        <div className="checklist-icon">✓</div>
                        <div className="checklist-content">
                            <strong>Third-Party Sharing</strong>
                            <div className="checklist-value">
                                Peeklogic does not collect, receive, or have access to any data processed by
                                this application. No data is shared with Peeklogic or any party other than
                                the Salesforce organization you configure.
                            </div>
                        </div>
                    </div>
                    <div className="checklist-item">
                        <div className="checklist-icon">✓</div>
                        <div className="checklist-content">
                            <strong>Security</strong>
                            <div className="checklist-value">
                                OAuth credentials are encrypted at rest using ServiceNow&#x2019;s native two-way
                                encryption (Password2). All communication with Salesforce occurs over HTTPS.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="support-section">
                <h3>Removing Your Data</h3>
                <p className="support-description">
                    Disconnecting your Salesforce connection from the Connection tab removes the stored
                    OAuth credentials and associated sync configuration from your ServiceNow instance.
                </p>
            </div>
        </div>
    );
}