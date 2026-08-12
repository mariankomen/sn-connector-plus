import React, { useState } from 'react'
import axios from 'axios'
import '../app.css'
import './ConnectionTab.css'
import Button from './ui/Button'

const DEFAULT_SF_LOGIN_URL = 'https://login.salesforce.com/services/oauth2'
const apiBaseUrl = '/api/x_peekl_salesfor_0/x_peekl_salesfor_0_salesforce_integratio'

const userToken = () => (window as Window & { g_ck?: string }).g_ck || ''

export type ConnectionTabProps = {
    isAuthenticated: boolean
    connectionInfo?: unknown
    onAuthenticationChange?: (authenticated: boolean, info?: unknown | null) => void
}

export default function ConnectionTab({
    isAuthenticated,
    connectionInfo = null,
    onAuthenticationChange,
}: ConnectionTabProps) {
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [credentials, setCredentials] = useState({
        client_id: '',
        client_secret: '',
        redirect_uri: '',
    })

    const handleLogin = async () => {
        if (!credentials.client_id || !credentials.client_secret || !credentials.redirect_uri) {
            setError('❌ Please enter Client ID, Client Secret, and Redirect URI')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await axios.post(
                `${apiBaseUrl}/connection`,
                {
                    clientId: credentials.client_id,
                    clientSecret: credentials.client_secret,
                    redirectUri: credentials.redirect_uri,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-UserToken': userToken(),
                    },
                }
            )
            if (!response.data?.connectionId) {
                throw new Error(response.data?.error || 'Failed to initialize connection')
            }

            localStorage.setItem('salesforce_connection_id', response.data.connectionId)
        } catch (error: unknown) {
            console.error('Connection init error:', error)
            const err = error as { response?: { data?: { error?: string } }; message?: string }
            setError(
                '❌ Failed to initialize connection: ' +
                    (err.response?.data?.error || err.message || String(error))
            )
            setLoading(false)
            return
        }

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: credentials.client_id,
            client_secret: credentials.client_secret,
            redirect_uri: credentials.redirect_uri,
            prompt: 'login',
        })

        const authorizationUrl = `${DEFAULT_SF_LOGIN_URL}/authorize?${params.toString()}`
        console.log(`authorizationUrl: ${authorizationUrl}`)
        window.location.href = authorizationUrl
    }

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect?')) {
            return
        }

        try {
            await axios.post(
                `${apiBaseUrl}/connection/disconnect`,
                {},
                {
                    headers: {
                        Accept: 'application/json',
                        'X-UserToken': userToken(),
                    },
                }
            )
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } }; message?: string }
            console.warn('Disconnect error:', err?.response?.data?.error || err.message)
        }

        localStorage.removeItem('salesforce_connection_id')

        onAuthenticationChange?.(false, null)
        window.location.reload()
    }

    if (isAuthenticated) {
        return (
            <div>
                <h2>Salesforce Connection</h2>
                <div className="connection-info">
                    <h3>✅ Connected to Salesforce</h3>
                    {connectionInfo ? (
                        <pre className="connection-info-json">
                            {typeof connectionInfo === 'string'
                                ? connectionInfo
                                : JSON.stringify(connectionInfo, null, 2)}
                        </pre>
                    ) : null}
                </div>
                <Button variant="danger" onClick={handleDisconnect} className="btn-disconnect">
                    Disconnect
                </Button>
            </div>
        )
    }

    return (
        <div>
            <h2>Connect to Salesforce</h2>
            {error && (
                <div className={`alert ${error.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>
                    {error}
                </div>
            )}
            <div>
                <div className="form-group">
                    <label htmlFor="client_id">Client ID (Consumer Key) *</label>
                    <input
                        type="text"
                        id="client_id"
                        value={credentials.client_id}
                        onChange={(e) => setCredentials({ ...credentials, client_id: e.target.value })}
                        placeholder="Enter your Salesforce Connected App Client ID"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="client_secret">Client Secret (Consumer Secret) *</label>
                    <input
                        type="password"
                        id="client_secret"
                        value={credentials.client_secret}
                        onChange={(e) => setCredentials({ ...credentials, client_secret: e.target.value })}
                        placeholder="Enter your Salesforce Connected App Client Secret"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="redirect_uri">Redirect URI *</label>
                    <input
                        type="text"
                        id="redirect_uri"
                        value={credentials.redirect_uri}
                        onChange={(e) => setCredentials({ ...credentials, redirect_uri: e.target.value })}
                        placeholder="Enter your redirect URI. This must match the Callback URL configured in your Salesforce Connected App"
                        required
                    />
                </div>
                <Button variant="success" onClick={handleLogin} disabled={loading} loading={loading}>
                    Connect
                </Button>
            </div>
        </div>
    )
}
