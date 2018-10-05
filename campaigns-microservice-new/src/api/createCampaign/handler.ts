import debug from '../../lib/logger';
import decrypt from '../../lib/auth-token-decryptor';
import { ApiErrors } from '../../lib/errors';
import { CampaignEvent, CampaignService as CampaignServiceType, TokenData, CampaignStatus } from '../../types';
import campaignService from '../../models/campaign';

export function handlerService(service: CampaignServiceType) {
  return async function handler({ campaign, authToken }: CampaignEvent) {
    debug('= createCampaign.action', JSON.stringify({ campaign, authToken }));
    if (!authToken) {
      throw new Error('[403] Access denied'); // It'll be moved to Authentication lambda
    }
    if (!campaign) {
      throw new Error('[400] No campaign specified');
    }

    try {
      const {sub}: TokenData = decrypt(authToken);
      campaign.userId = sub;
      campaign.status = CampaignStatus.DRAFT;
      await service.save(campaign);
      return campaign;
    } catch (error) {
      throw ApiErrors.response(error);
    }
  }
}

export default handlerService(campaignService);