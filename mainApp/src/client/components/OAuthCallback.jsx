import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './OAuthCallback.css';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner.jsx';

const baseUrl = "/api/x_1955226_peeklo_1/x_1955226_peeklo_1_salesforce_integratio";
const APP_HOME_URL = '/sp?id=peeklogic_salesforce_connector_plus';


export default function OAuthCallback({ code }) {
    const [status, setStatus] = useState('processing');
    const [message, setMessage] = useState('Processing authorization...');

    const connectionId = localStorage.getItem("salesforce_connection_id");
    const codeVerifier = localStorage.getItem("salesforce_code_verifier");

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        try {
            if (!code || !connectionId) {
                setStatus('error');
                setMessage('Code or connection id is missing');
                return;
            }
            
            const response = await axios.post(`${baseUrl}/auth`, {
                code,
                connectionId,
                codeVerifier
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-UserToken': window.g_ck || ''
                }
            });
            if (response.data.access_token) {
                localStorage.removeItem("salesforce_code_verifier");
                setStatus('success');
                setMessage('✅ Successfully connected to Salesforce! Redirecting...');


                window.location.href = APP_HOME_URL;
            } else {
                const errorText = response.data.error || response.data.message || 'Failed to complete authorization';
                setStatus('error');
                setMessage('Failed to complete authorization: ' + errorText);
                console.error('Callback error:', errorText);
            }
        } catch (error) {
            console.error('Callback error:', error);
            setStatus('error');
            setMessage('Error processing authorization: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleGoBack = () => {
        window.location.href = APP_HOME_URL;
    };

    return (
        <div className="oauth-callback-container">
            {status === 'processing' && (
                <>
                    <LoadingSpinner size="xlarge" />
                    <h2>{message}</h2>
                    <p className="oauth-message">Please wait...</p>
                </>
            )}
            
            {status === 'success' && (
                <>
                    <div className="oauth-status-icon">✅</div>
                    <h2 className="oauth-success">{message}</h2>
                </>
            )}
            
            {status === 'error' && (
                <>
                    <div className="oauth-status-icon">❌</div>
                    <h2 className="oauth-error">{message}</h2>
                    <Button
                        variant="primary"
                        onClick={handleGoBack}
                        className="btn-go-back"
                    >
                        Go Back
                    </Button>
                </>
            )}
        </div>
    );
}