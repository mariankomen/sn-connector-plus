var SalesforceObjectService = Class.create();

SalesforceObjectService.prototype = {
    initialize: function () {},

    query: function(queryString){
        const connectionService = new x_1955226_peeklo_1.SalesforceConnectionService();
        const connectionLookup = connectionService.getCurrentUserConnection();
        if (!connectionLookup || !connectionLookup.success) {
            gs.error('[Salesforce Object Service]: connection lookup failed - ' + (connectionLookup ? connectionLookup.error : 'connectionLookup is null'));
            return false;
        }
        const resolvedConnectionId = connectionLookup.connection_id;

        const connectionDetails = connectionService.getConnectionDetails(resolvedConnectionId);
        if (!connectionDetails || !connectionDetails.success) {
            gs.error('[Salesforce Object Service]: failed to load connection details - ' + (connectionDetails ? connectionDetails.error : 'connectionDetails is null'));
            return false;
        }

        const connection = connectionDetails.connection;
        if (!connection || !connection.instance_url) {
            gs.error('[Salesforce Object Service]: Salesforce instance URL is missing from the connection');
            return false;
        }

        if (!connection.access_token && !connection.refresh_token) {
            return false;
        }
        
        const oauthService = new x_1955226_peeklo_1.SalesforceOAuthService();
        const accessToken = oauthService.ensureValidAccessToken({
            connection: connection,
            connectionService: connectionService
        });
        if (!accessToken) {
            gs.error('[Salesforce Object Service]: unable to obtain Salesforce access token');
            return false;
        }

        const endpoint = `${connection.instance_url}/services/data/v60.0/query?q=${encodeURIComponent(queryString)}`;

        const request = new sn_ws.RESTMessageV2();
        request.setEndpoint(endpoint);
        request.setHttpMethod('GET');
        request.setRequestHeader('Content-Type', 'application/json');
        request.setRequestHeader('Authorization', 'Bearer ' + accessToken);

        const response = request.execute();
        const status = response.getStatusCode();
        const body = response.getBody();

        let parsed;
        try {
            parsed = JSON.parse(body);
        } catch (e) {
            throw new Error(`Invalid JSON: ${body}`);
        }

        if (status < 200 || status >= 300) {
            throw new Error(`HTTP ${status}: ${body}`);
        }

        if(!parsed.records){
            throw new Error(`Can not query records.`);
        }
        return parsed.records || [];
    },

    getObjectsOfRecordsList: function (recordsIdSet) {
        const recordsPrefixes = [];
        recordsIdSet.forEach(el => {
            if(typeof el === 'string'){
                const idprefix = el.slice(0, 3);
                if(!recordsPrefixes.includes(idprefix)){
                    recordsPrefixes.push(idprefix);
                }
            }
        })
        
        const queryString = `
            SELECT KeyPrefix, QualifiedApiName FROM EntityDefinition
            WHERE KeyPrefix IN ('${recordsPrefixes.join("', '")}')
        `
        const entityDefinitions = this.query(queryString);
        const entityDefinitionsMap = {};
        entityDefinitions.forEach(definition => {
            entityDefinitionsMap[definition.KeyPrefix] = definition.QualifiedApiName;
        })

        const recordWithObjectMap = {};
        recordsIdSet.forEach(recordId => {
            if(typeof recordId === 'string'){
                const idprefix = recordId.slice(0, 3);
                recordWithObjectMap[recordId] = entityDefinitionsMap[idprefix];
            }
        })

        return recordWithObjectMap;
    }
};