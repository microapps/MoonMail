import { Campaign } from './Campaign';

export interface CampaignRepository {
  save: (campaign: Campaign) => Promise<Campaign>,
  edit: (id:string, campaign: Campaign) => Promise<Campaign>,
  get: (id: string) => Promise<Campaign>,
  list: (userId: string) => Promise<Array<Campaign>>
}