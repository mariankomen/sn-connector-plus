import React, { useState, useEffect } from 'react';
import ConnectionTab from './components/ConnectionTab';
import SettingsTab from './components/SettingsTab.jsx';
import SupportTab from './components/SupportTab.jsx';
import PrivacyPolicyTab from './components/PrivacyPolicyTab.jsx';
import OAuthCallback from './components/OAuthCallback.jsx';
import { TaskConfigProvider } from './context/TaskConfigContext.jsx';
import LoadingSpinner from './components/ui/LoadingSpinner.jsx';
import './app.css';
import { getConnectorPortalUrl } from './connectorPortalUrl';

const VALID_TABS = ['connection', 'settings', 'support', 'privacy'];

export default function App() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const initialTab = VALID_TABS.includes(urlParams.get('tab') || '')
        ? urlParams.get('tab')!
        : 'connection';

    const [activeTab, setActiveTab] = useState(initialTab);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [connectionInfo, setConnectionInfo] = useState<unknown | null>(null);
    const [isCallback, setIsCallback] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    const redirectToCleanUrl = () => {
        const cleanUrl = getConnectorPortalUrl();
        const targetWindow = window.top && window.top !== window.self ? window.top : window;
        if (targetWindow.location.href !== cleanUrl) {
            console.log('Redirecting to clean URL:', cleanUrl);
            targetWindow.location.replace(cleanUrl);
        }
    };

    const renderHeader = () => (
        <div className="header">
            <h1>🔗 Peeklogic ServiceNow connector</h1>
            {!isCallback && (
                <p>
                    Connect and synchronize data with Salesforce
                </p>
            )}
        </div>
    );

    const handleAuthenticationChange = (authenticated: boolean, info?: unknown | null) => {
        setIsAuthenticated(authenticated);
        setConnectionInfo(info ?? null);
        if (authenticated) {
            setActiveTab('settings');
        } else {
            setActiveTab('connection');
        }
    };

    const checkAuthenticationStatus = async () => {
        // only redirect to clean URL if no valid tab param is present
        if (!VALID_TABS.includes(urlParams.get('tab') || '')) {
            redirectToCleanUrl();
        }
        const connectionId = localStorage.getItem('salesforce_connection_id');

        if (!connectionId) {
            setIsAuthenticated(false);
            if (initialTab === 'settings') setActiveTab('connection');
            setAuthLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio/connection/status', {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'X-UserToken': (window as Window & { g_ck?: string }).g_ck || ''
                },
                credentials: 'same-origin'
            });

            if (!res.ok) {
                throw new Error('Status check failed with code ' + res.status);
            }

            const data = await res.json();
            const isValid = data && data.isValid;
            if (isValid) {
                setIsAuthenticated(true);
                if (initialTab === 'connection') setActiveTab('settings');
            } else {
                localStorage.removeItem('salesforce_connection_id');
                setIsAuthenticated(false);
                if (initialTab === 'settings') setActiveTab('connection');
            }
        } catch (err) {
            console.warn('Auth status check failed:', err);
            setIsAuthenticated(false);
            if (initialTab === 'settings') setActiveTab('connection');
        } finally {
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        if (code) {
            setIsCallback(true);
            setAuthLoading(false);
            return;
        }

        setAuthLoading(true);
        checkAuthenticationStatus();
    }, []);

    if (isCallback) {
        return (
            <div className="salesforce-integration-app">
                {renderHeader()}
                <OAuthCallback code={code} />
            </div>
        );
    }

    if (authLoading) {
        return (
            <div className="salesforce-integration-app">
                {renderHeader()}
                <div className="fullpage-loader">
                    <LoadingSpinner size="xlarge" />
                </div>
            </div>
        );
    }

    return (
        <TaskConfigProvider isAuthenticated={isAuthenticated}>
            <div className="salesforce-integration-app">
                {renderHeader()}

                <div className="tab-container">
                    <div className="tab-nav">
                        <button
                            className={`tab-button ${activeTab === 'connection' ? 'active' : ''}`}
                            onClick={() => setActiveTab('connection')}
                        >
                            🔌 Connection
                            {isAuthenticated && (
                                <span className="tab-button-icon tab-button-icon-success">✓</span>
                            )}
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'settings' ? 'active' : ''} ${!isAuthenticated ? 'disabled' : ''}`}
                            onClick={() => isAuthenticated && setActiveTab('settings')}
                            disabled={!isAuthenticated}
                            title={!isAuthenticated ? 'Connect to Salesforce first' : 'Configure sync settings'}
                        >
                            ⚙️ Settings
                            {!isAuthenticated && (
                                <span className="tab-button-icon tab-button-icon-disabled">🔒</span>
                            )}
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'support' ? 'active' : ''}`}
                            onClick={() => setActiveTab('support')}
                            title="Get help and support"
                        >
                            📞 Support
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'privacy' ? 'active' : ''}`}
                            onClick={() => setActiveTab('privacy')}
                            title="App Privacy Policy"
                        >
                            🔒 Privacy Policy
                        </button>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'connection' && (
                            <ConnectionTab
                                isAuthenticated={isAuthenticated}
                                connectionInfo={connectionInfo}
                                onAuthenticationChange={handleAuthenticationChange}
                            />
                        )}
                        {activeTab === 'settings' && (
                            <SettingsTab
                                isAuthenticated={isAuthenticated}
                            />
                        )}
                        {activeTab === 'support' && (
                            <SupportTab />
                        )}
                        {activeTab === 'privacy' && (
                            <PrivacyPolicyTab />
                        )}
                    </div>
                </div>
            </div>
        </TaskConfigProvider>
    );
}