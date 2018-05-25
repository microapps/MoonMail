import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import 'sinon-as-promised';
import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import ApiKeys from './index';

const expect = chai.expect;
chai.use(sinonChai);

describe('ApiKeys', () => {
  let apiGatewayStub;
  const userId = 'some-user-id';
  const usagePlanId = 'usage-plan-id';
  const apiKey = 'api-key-value';
  const apiKeyId = 'api-key-id';
  const newKeyResponse = { id: apiKeyId, value: apiKey };
  const usageAttachResponse = { keyId: newKeyResponse.id, keyType: 'API_KEY', usagePlanId };

  beforeEach(() => {
    awsMock.mock('APIGateway', 'createApiKey', newKeyResponse);
    awsMock.mock('APIGateway', 'createUsagePlanKey', usageAttachResponse);
    awsMock.mock('APIGateway', 'deleteApiKey', true);
    apiGatewayStub = new AWS.APIGateway();
    process.env.API_USAGE_PLAN_ID = usagePlanId;
  });
  afterEach(() => {
    awsMock.restore('APIGateway');
    delete process.env.API_USAGE_PLAN_ID;
  });

  describe('#create', () => {
    it('should create an Api Key for the given user', async () => {
      const result = await ApiKeys.create({ client: apiGatewayStub, userId });
      const expected = {
        description: 'Key MoonMail public API',
        enabled: true,
        generateDistinctId: true,
        name: userId
      };
      expect(apiGatewayStub.createApiKey).to.have.been.calledWith(expected);
    });

    it('should attach the new Api Key to the usage plan', async () => {
      const result = await ApiKeys.create({ client: apiGatewayStub, userId });
      const expected = usageAttachResponse;
      expect(apiGatewayStub.createUsagePlanKey).to.have.been.calledWith(expected);
    });

    it('should return the API key object', async () => {
      const result = await ApiKeys.create({ client: apiGatewayStub, userId });
      expect(result).to.have.deep.property('apiKey', newKeyResponse);
    });
  });

  describe('#delete', () => {
    it('should delete the provided API Key', async () => {
      const result = await ApiKeys.delete({ client: apiGatewayStub, apiKeyId });
      const expected = { apiKey: apiKeyId };
      expect(apiGatewayStub.deleteApiKey).to.have.been.calledWith(expected);
    });
  });
});
