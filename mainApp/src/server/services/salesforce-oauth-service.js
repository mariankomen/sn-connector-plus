const SalesforceOAuthService = Class.create();
SalesforceOAuthService.prototype = {
    initialize: function () {
        this.baseUrl = 'https://login.salesforce.com/services/oauth2';
        this.accessTokenTTLMinutes = 60;
    },

    exchangeCodeForToken: function (params) {
        try {
            const request = new sn_ws.RESTMessageV2();
            request.setEndpoint(`${this.baseUrl}/token`);
            request.setHttpMethod('POST');
            request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

            let body = 'grant_type=authorization_code' +
                '&client_id=' + encodeURIComponent(params.clientId) +
                '&client_secret=' + encodeURIComponent(params.clientSecret) +
                '&redirect_uri=' + encodeURIComponent(params.redirectUri) +
                '&code=' + encodeURIComponent(params.code);

            // PKCE: Salesforce requires the code_verifier matching the code_challenge sent to /authorize
            if (params.codeVerifier) {
                body += '&code_verifier=' + encodeURIComponent(params.codeVerifier);
            }

            request.setRequestBody(body);

            const response = request.execute();
            const responseBody = response.getBody();

            if (response.getStatusCode() === 200) {
                return {
                    success: true,
                    token: JSON.parse(responseBody)
                };
            }

            gs.error('SalesforceOAuthService.exchangeCodeForToken failed: ' + responseBody);
            return {
                success: false,
                error: 'Token exchange failed: ' + responseBody
            };
        } catch (error) {
            gs.error('SalesforceOAuthService.exchangeCodeForToken error: ' + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    },

    calculateAccessTokenExpiresAt: function (issuedAtValue) {
        const issuedAtMs = parseInt(issuedAtValue, 10);
        if (isNaN(issuedAtMs)) {
            return null;
        }

        const expiresAtMs = issuedAtMs + (this.accessTokenTTLMinutes * 60 * 1000);
        const expiresAt = new GlideDateTime();
        expiresAt.setNumericValue(expiresAtMs);
        return expiresAt.getDisplayValue();
    },

    refreshAccessToken: function (params) {
        try {
            if (!params || !params.refreshToken || !params.clientId || !params.clientSecret) {
                gs.error('SalesforceOAuthService.refreshAccessToken: Missing required parameters');
                return null;
            }

            const request = new sn_ws.RESTMessageV2();
            request.setEndpoint(`${this.baseUrl}/token`);
            request.setHttpMethod('POST');
            request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

            let body = 'grant_type=refresh_token' +
                '&client_id=' + encodeURIComponent(params.clientId) +
                '&client_secret=' + encodeURIComponent(params.clientSecret) +
                '&refresh_token=' + encodeURIComponent(params.refreshToken);

            if (params.redirectUri) {
                body += '&redirect_uri=' + encodeURIComponent(params.redirectUri);
            }

            request.setRequestBody(body);
            const response = request.execute();
            const responseBody = response.getBody();

            if (response.getStatusCode() === 200) {
                const parsed = JSON.parse(responseBody);
                return {
                    access_token: parsed.access_token || null,
                    issued_at: parsed.issued_at || null
                };
            }

            gs.error('SalesforceOAuthService.refreshAccessToken failed: ' + responseBody);
            return null;
        } catch (error) {
            gs.error('SalesforceOAuthService.refreshAccessToken error: ' + error.message);
            return null;
        }
    },

    ensureValidAccessToken: function ({ connection, connectionService }) {
        if (!connection) {
            gs.error('SalesforceOAuthService.ensureValidAccessToken: Connection data is required');
            return null;
        }

        const tokenExpired = this._isAccessTokenMissingOrExpired(connection.access_token, connection.access_token_expires_at);
        if (!tokenExpired) {
            return connection.access_token;
        }
        if (!connection.refresh_token) {
            gs.error('SalesforceOAuthService.ensureValidAccessToken: Refresh token is missing. Please re-authorize the connection.');
            return null;
        }

        const refreshResult = this.refreshAccessToken({
            refreshToken: connection.refresh_token,
            clientId: connection.client_id,
            clientSecret: connection.client_secret,
            redirectUri: connection.redirect_uri
        });
        if (!refreshResult || !refreshResult.access_token) {
            gs.error('SalesforceOAuthService.ensureValidAccessToken: Failed to refresh Salesforce access token');
            return null;
        }

        const newAccessToken = refreshResult.access_token;
        const issuedAt = refreshResult.issued_at;
        const newExpiresAt = issuedAt ? this.calculateAccessTokenExpiresAt(issuedAt) : null;

        if (connectionService && connectionService.saveConnection) {
            const saveResult = connectionService.saveConnection({
                client_id: connection.client_id,
                client_secret: connection.client_secret,
                instance_url: connection.instance_url,
                access_token: newAccessToken,
                access_token_expires_at: newExpiresAt
            });
            if (!saveResult.success) {
                gs.error('SalesforceOAuthService.ensureValidAccessToken: Failed to persist refreshed token: ' + (saveResult.error || 'Unknown error'));
                return null;
            }
        }

        return newAccessToken;
    },

    _isAccessTokenMissingOrExpired: function (tokenValue, expiresAtValue) {
        if (!tokenValue) {
            return true;
        }

        if (!expiresAtValue) {
            return true;
        }

        try {
            const now = new GlideDateTime();
            const expiresAt = new GlideDateTime();
            expiresAt.setDisplayValue(expiresAtValue);
            return !expiresAt.after(now);
        } catch (error) {
            gs.error('SalesforceOAuthService._isAccessTokenMissingOrExpired error: ' + error.message);
            return true;
        }
    },

    type: 'SalesforceOAuthService'
};
