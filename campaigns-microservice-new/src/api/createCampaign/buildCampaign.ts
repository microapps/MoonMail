import { TokenData, Campaign, CampaignStatus } from '../../types';
import * as cuid from 'cuid';

export function buildCampaign(campaign: Campaign, { sub }: TokenData) {
  campaign.userId = sub;
  campaign.id = cuid();
  campaign.status = CampaignStatus.DRAFT;
  return campaign;
}