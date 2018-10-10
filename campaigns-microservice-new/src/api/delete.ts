import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';

import campaignRepository from '../repositories/campaign';
import decryptor from '../lib/auth-token-decryptor';
import debug from '../lib/logger';
import ApiErrors from '../lib/errors';

export default async ({ pathParameters: { id }, headers: { Authorization: authToken } }: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  debug('= Delete Campaign', JSON.stringify({ id, authToken }));

  try {
    const { sub: userId } = decryptor(authToken);
    await campaignRepository.delete(userId, id);
    return {
      statusCode: 204,
      body: ''
    };
  } catch (error) {
    console.log('Error Delete Campaign', error);
    return ApiErrors.response(error);
  }
}
