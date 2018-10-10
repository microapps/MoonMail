import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';

import debug from '../lib/logger';
import decryptor from '../lib/auth-token-decryptor';
import ApiErrors from '../lib/errors';
import { TokenData, CampaignStatus, Campaign } from '../types';
import campaignRepository from '../repositories/campaign';

export default async ({ body, headers: {Authorization: authToken} }: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  debug('= Create Campaign', JSON.stringify({ body, authToken }));
  try {
    const campaign: Campaign = JSON.parse(body);
    const {sub}: TokenData = decryptor(authToken);
    campaign.userId = sub;
    campaign.status = CampaignStatus.DRAFT;

    const campaignSaved = await campaignRepository.save(campaign);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify(campaignSaved)
    };
  } catch (error) {
    console.log('Error Create campaign', error);
    return ApiErrors.response(error);
  }
}
