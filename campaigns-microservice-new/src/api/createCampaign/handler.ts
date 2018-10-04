import * as cuid from 'cuid';

import { debug } from '../../../../api/lib/logger';
import decrypt from '../../lib/auth-token-decryptor';
import { ApiErrors } from '../../lib/errors';
import { CampaignEvent, TokenData, Campaign, CampaignStatus } from '../../types';
import * as CampaignModel from '../../models/campaign';

export default async function handler({ campaign, authToken }: CampaignEvent) {
  debug('= createCampaign.action', JSON.stringify({ campaign, authToken }));
  if (!authToken) {
    throw new Error('[403] Access denied'); // It'll be moved to Authentication lambda
  }
  if (!campaign) {
    throw new Error('[400] No campaign specified');
  }

  try {
    const decodedToken: TokenData = decrypt(authToken);
    const fullCampaign: Campaign = buildCampaign(campaign, decodedToken);
    await CampaignModel.save(fullCampaign);
    return campaign;
  } catch (error) {
    console.log(error)
    throw ApiErrors.response(error);
  }
}

function buildCampaign(campaign: Campaign, { sub }: TokenData) {
  if (!campaign) {
    throw new Error('No campaign specified');
  }

  campaign.userId = sub;
  campaign.id = cuid();
  campaign.status = CampaignStatus.DRAFT;
  return campaign;
}