import { Campaign } from './Campaign';

export interface CampaignService {
  save: (campaign: Campaign) => Promise<Campaign>,
  edit: (id:string, campaign: Campaign) => Promise<Campaign>,
  get: (id: string) => Promise<Campaign>,
  list: (userId: string) => Promise<Array<Campaign>>
}