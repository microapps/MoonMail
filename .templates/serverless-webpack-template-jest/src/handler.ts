import * as ApiGatewayUtils from './utils/ApiGatewayUtils';

export default async function version() {
  return ApiGatewayUtils.buildResponse({
    statusCode: 200,
    body: {
      version: '0.0.1'
    }
  });
}
