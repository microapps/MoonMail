import debug from '../../lib/logger';
import decrypt from '../../lib/auth-token-decryptor';
import { ApiErrors } from '../../lib/errors';
import { CampaignEvent, CampaignRepository, TokenData, CampaignStatus, Campaign } from '../../types';
import campaignRepositoryFactory from '../../repositories/campaign';

export function handlerService(service: CampaignRepository) {
  return async function handler({ campaign, authToken }: CampaignEvent): Promise<Campaign> {
    debug('= createCampaign.action', JSON.stringify({ campaign, authToken }));
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

export default handlerService(campaignRepositoryFactory);