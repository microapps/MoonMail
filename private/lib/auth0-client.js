import request from 'request-promise';
import { ManagementClient } from 'auth0';

export default class Auth0Client {
  static query(method, params, clientParams) {
    return new Auth0Client(clientParams).query(method, params);
  }

  constructor(params = {}) {
    if (!(params.clientId && params.clientSecret && params.baseUrl)) throw new Error('Params missing');
    this.clientId = params.clientId;
    this.clientSecret = params.clientSecret;
    this.baseUrl = params.baseUrl;
  }

  async query(method, params) {
    return this.client()
      .then(client => client[method](params));
  }

  async client() {
    return this.apiClient ? this.apiClient : this._buildApiClient();
  }

  _buildApiClient() {
    return this._getApiToken()
      .then(token => this._setApiClient(token));
  }

  _setApiClient(token) {
    this.apiClient = new ManagementClient({token, domain: this.baseUrl});
    return this.apiClient;
  }

  async _getApiToken() {
    const url = `https://${this.baseUrl}/oauth/token`;
    const audience = `https://${this.baseUrl}/api/v2/`;
    const options = {
      method: 'POST',
      url,
      headers: {'content-type': 'application/json'},
      body: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'read:users read:user_idp_tokens',
        grant_type: 'client_credentials',
        audience
      },
      json: true
    };
    const response = await request(options);
    const token = response.access_token;
    return token;
  }
}
