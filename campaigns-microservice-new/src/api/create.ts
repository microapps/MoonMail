import middy from 'middy';

import decryptor from '../lib/auth-token-decryptor';
import { TokenData, CampaignStatus, Campaign } from '../types';
import campaignRepository from '../repositories/campaign';
import { apiRequestRoutine, logRoutine } from '../../common/middlewares';
import { NormalizedEvent } from '../../common/@types';
import { jsonBodyParser } from 'middy/middlewares';

interface Event extends NormalizedEvent {
  body: Campaign
};

export async function action({body: campaign, headers: {Authorization: authToken}}: Event): Promise<Campaign> {
  const {sub}: TokenData = decryptor(authToken);
  campaign.userId = sub;
  campaign.status = CampaignStatus.DRAFT;

  return await campaignRepository.save(campaign);
}

export default middy(action)
  .use(jsonBodyParser())
  .use(apiRequestRoutine())
  .use(logRoutine());