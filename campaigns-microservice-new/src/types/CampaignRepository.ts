import { Campaign } from './Campaign';
import { ListOptions } from './DatabaseService';

export interface CampaignRepository {
  save: (campaign: Campaign) => Promise<Campaign>,
  update: (campaign: Campaign, userId: string, id: string) => Promise<Campaign>,
  get: (hashKey:string, id: string, fields?: Array<string>) => Promise<Campaign>,
  list: (hashKey: string, options: ListOptions) => Promise<Array<any>>,
  delete: (userId: string, id: string) => Promise<boolean>
}