import chai from 'chai';
import nock from 'nock';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import 'sinon-as-promised';
import auth0 from 'auth0';
import Auth0Client from './auth0-client';

const expect = chai.expect;
chai.use(sinonChai);

describe('Auth0Client', () => {
  const baseUrl = 'some.domain.com';
  const clientId = 'auth0-client-id';
  const clientSecret = 'auth0-client-secret';
  const auth0Oauth = nock(`https://${baseUrl}/oauth`);
  const token = 'foo';

  beforeEach(() => {
    auth0Oauth
      .post('/token').reply(200, {access_token: token});
    sinon.spy(auth0, 'ManagementClient');
  });

  afterEach(() => {
    nock.cleanAll();
    auth0.ManagementClient.restore();
  });

  describe('#constructor', () => {
    it('should throw an error if required params are not provided', () => {
      const constructor = () => new Auth0Client();
      expect(constructor).to.throw(Error, 'Params missing');
    });
  });

  describe('#client', () => {
    context('when the ManagementClient client does not exist', () => {
      it('should create it', async () => {
        const api = new Auth0Client({baseUrl, clientId, clientSecret});
        const result = await api.client();
        expect(auth0.ManagementClient).to.have.been.calledOnce;
        const expectedArgs = {token, domain: baseUrl};
        expect(auth0.ManagementClient).to.have.been.calledWithExactly(expectedArgs);
      });
    });

    context('when the ManagementClient client exists', () => {
      it('should return it', async () => {
        const api = new Auth0Client({baseUrl, clientId, clientSecret});
        const apiClient = {test: 'client'};
        api.apiClient = apiClient;
        const result = await api.client();
        expect(result).to.deep.equal(apiClient);
      });
    });
  });

  describe('#query', () => {
    const management = sinon.stub({getUser: () => null});
    const auth0Response = {test: 'response'};

    before(function () {
      management.getUser.resolves(auth0Response);
      this.api = new Auth0Client({baseUrl, clientId, clientSecret});
      sinon.stub(this.api, 'client').resolves(management);
    });

    after(function () {
      management.getUser.restore();
      this.api.client.restore();
    });

    it('should forward the request to the ManagementClient client', async function () {
      const method = 'getUser';
      const params = {test: params};
      const result = await this.api.query(method, params);
      expect(result).to.deep.equal(auth0Response);
      expect(management[method]).to.have.been.calledWithExactly(params);
    });
  });
});
