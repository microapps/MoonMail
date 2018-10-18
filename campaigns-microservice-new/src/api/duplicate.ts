import middy from 'middy';

import { NormalizedEvent } from "../../common/@types";
import decryptor from "../lib/auth-token-decryptor";
import campaignRepository from '../repositories/campaign';
import { apiRequestRoutine, logRoutine } from "../../common/middlewares";
import { Campaign, CampaignStatus } from '../types';

interface Event extends NormalizedEvent {
  body: Campaign
};

export async function action({pathParameters: {id: campaignId}, headers: {Authorization: authToken}}: Event): Promise<Campaign> {
  const {sub: userId} = decryptor(authToken);

  const campaign = await campaignRepository.get(userId, campaignId);

  campaign.status = CampaignStatus.DRAFT;
  campaign.name = `${campaign.name} copy`;
  delete campaign.sentAt;
  delete campaign.archived;
  delete campaign.id;

  return await campaignRepository.save(campaign);
}

export default middy(action)
  .use(apiRequestRoutine())
  .use(logRoutine());