import * as ApiGatewayUtils from './utils/ApiGatewayUtils';

export default async function version(event: any) {
  console.log('Event', JSON.stringify(event));
  return ApiGatewayUtils.buildResponse({
    statusCode: 200,
    body: {
      version: '0.0.1'
    }
  });
}
