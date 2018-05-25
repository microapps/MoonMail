import { APIGateway } from 'aws-sdk';

function createApiGatewayClient() {
  return new APIGateway({ region: process.env.SERVERLESS_REGION });
}

function createApiKey({ client, userId }) {
  const apiGClient = client || createApiGatewayClient();
  return generateApiKey({ client: apiGClient, userId })
    .then(res => attachKeyToUsagePlan({ client: apiGClient, apiKey: res }));
}

function deleteApiKey({ client, apiKeyId }) {
  const apiGClient = client || createApiGatewayClient();
  return apiGClient.deleteApiKey({ apiKey: apiKeyId }).promise();
}

function generateApiKey({ client, userId }) {
  const params = {
    description: 'Key MoonMail public API',
    enabled: true,
    generateDistinctId: true,
    name: userId
  };
  return client.createApiKey(params).promise();
}

function attachKeyToUsagePlan({ client, apiKey }) {
  const params = {
    keyId: apiKey.id,
    keyType: 'API_KEY',
    usagePlanId: process.env.API_USAGE_PLAN_ID
  };
  return client.createUsagePlanKey(params).promise()
    .then(res => ({ apiKey, usagePlan: res }));
}

const ApiKeys = {
  create: createApiKey,
  delete: deleteApiKey
};

export default ApiKeys;
