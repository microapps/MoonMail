import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from 'middy';
import { jsonBodyParser } from 'middy/middlewares';

import campaignRepository from '../repositories/campaign';
import decryptor from '../lib/auth-token-decryptor';
import { apiRequestRoutine, logRoutine } from '../../common/middlewares';
import { TokenData } from '../types';

export async function action({pathParameters: {id: campaignId}, headers: {Authorization: authToken}}: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const {sub: userId}: TokenData = decryptor(authToken);
  await campaignRepository.delete(userId, campaignId);

  return {
    statusCode: 204,
    body: ''
  };
}

export default middy(action)
  .use(jsonBodyParser())
  .use(apiRequestRoutine())
  .use(logRoutine());
