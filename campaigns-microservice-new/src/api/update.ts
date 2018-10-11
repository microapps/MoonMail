import { APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

import debug from '../lib/logger';
import decryptor from '../lib/auth-token-decryptor';
import ApiErrors from '../lib/errors';
import { TokenData, Campaign } from '../types';
import campaignRepository from '../repositories/campaign';

export default async ({ body, pathParameters: { id: campaignId }, headers: { Authorization: authToken } }: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  debug('= Create Campaign', JSON.stringify({ body, campaignId, authToken }));
  try {
    const campaign: Campaign = JSON.parse(body);
    const {sub: userId}: TokenData = decryptor(authToken);
    campaign.userId = userId;

    const campaignSaved = await campaignRepository.update(campaign, userId, campaignId);
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