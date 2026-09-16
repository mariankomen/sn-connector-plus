import React, { useState } from 'react'
import axios from 'axios'
import '../app.css'
import './ConnectionTab.css'
import Button from './ui/Button'
import { getConnectorPortalUrl } from '../connectorPortalUrl'

type SalesforceEnvironment = 'production' | 'sandbox'

const SF_LOGIN_URLS: Record<SalesforceEnvironment, string> = {
    production: 'https://login.salesforce.com',
    sandbox: 'https://test.salesforce.com',
}
const apiBaseUrl = '/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio'

const userToken = () => (window as Window & { g_ck?: string }).g_ck || ''

const base64UrlEncode = (bytes: Uint8Array) => {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const generateCodeVerifier = () => {
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    return base64UrlEncode(randomBytes)
}

const generateCodeChallenge = async (verifier: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    return base64UrlEncode(new Uint8Array(digest))
}

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
    const [environment, setEnvironment] = useState<SalesforceEnvironment>('production')
    const [credentials, setCredentials] = useState({
        client_id: '',
        client_secret: '',
    })

    const handleLogin = async () => {
        if (!credentials.client_id || !credentials.client_secret) {
            setError('❌ Please enter Client ID and Client Secret')
            return
        }

        setLoading(true)
        setError('')

        // Redirect URI is always this connector page; it must match the Callback URL in the Salesforce app
        const redirectUri = getConnectorPortalUrl()
        const loginUrl = SF_LOGIN_URLS[environment]

        try {
            const response = await axios.post(
                `${apiBaseUrl}/connection`,
                {
                    clientId: credentials.client_id,
                    clientSecret: credentials.client_secret,
                    redirectUri,
                    loginUrl,
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

        // Salesforce now requires PKCE for the authorization code flow
        const codeVerifier = generateCodeVerifier()
        const codeChallenge = await generateCodeChallenge(codeVerifier)
        localStorage.setItem('salesforce_code_verifier', codeVerifier)

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: credentials.client_id,
            redirect_uri: redirectUri,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            prompt: 'login',
        })

        const authorizationUrl = `${loginUrl}/services/oauth2/authorize?${params.toString()}`
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
                    <label htmlFor="environment">Environment *</label>
                    <select
                        id="environment"
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value as SalesforceEnvironment)}
                    >
                        <option value="production">Production</option>
                        <option value="sandbox">Sandbox</option>
                    </select>
                </div>
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
                    <small>
                        Callback URL for your Salesforce app: <code>{getConnectorPortalUrl()}</code>
                    </small>
                </div>
                <Button variant="success" onClick={handleLogin} disabled={loading} loading={loading}>
                    Connect
                </Button>
            </div>
        </div>
    )
}
