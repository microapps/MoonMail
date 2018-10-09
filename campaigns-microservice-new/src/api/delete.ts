import { APIGatewayEvent } from 'aws-lambda';

import campaignRepository from '../repositories/campaign';
import { CampaignRepository } from '../types';
import decryptor from '../lib/auth-token-decryptor';
import debug from '../lib/logger';
import ApiErrors from '../lib/errors';

export function deleteHandleFactory (campaignRepository: CampaignRepository) {
  return async ({pathParameters: {id}, headers: {Authorization: authToken}}: APIGatewayEvent) => {
    debug('= Delete Campaign', JSON.stringify({ id, authToken }));

    try {
      const {sub: userId} = decryptor(authToken);
      await campaignRepository.delete(userId, id);
      return {
        statusCode: 204
      };
    } catch (error) {
      console.log('Error', error);
      return ApiErrors.response(error);
    }
  }
}

export default deleteHandleFactory(campaignRepository);