import middy from 'middy';
import { jsonBodyParser } from 'middy/middlewares';

import decryptor from '../lib/auth-token-decryptor';
import { TokenData, Campaign } from '../types';
import campaignRepository from '../repositories/campaign';
import { NormalizedEvent } from '../../common/@types';
import { apiRequestRoutine, logRoutine } from '../../common/middlewares';

interface Event extends NormalizedEvent {
  body: Campaign
};

export async function action({ body: campaign, pathParameters: { id: campaignId }, headers: { Authorization: authToken } }: Event): Promise<Campaign> {
  const {sub: userId}: TokenData = decryptor(authToken);
  campaign.userId = userId;

  return await campaignRepository.update(campaign, userId, campaignId);
}

export default middy(action)
  .use(jsonBodyParser())
  .use(apiRequestRoutine())
  .use(logRoutine());
