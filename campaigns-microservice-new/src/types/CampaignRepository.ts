import { Campaign } from './Campaign';

export interface CampaignRepository {
  save: (campaign: Campaign) => Promise<Campaign>,
  update: (campaign: Campaign, userId: string, id: string) => Promise<Campaign>,
  get: (id: string) => Promise<Campaign>,
  list: (userId: string) => Promise<Array<Campaign>>,
  delete: (userId: string, id: string) => Promise<boolean>
}