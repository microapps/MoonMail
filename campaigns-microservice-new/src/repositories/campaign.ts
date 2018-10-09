import * as cuid from 'cuid';

import { Campaign, DatabaseService, CampaignRepository } from '../types';
import * as campaignSchemas from '../models/schema/campaign';
import validate from '../models/schema/validator';
import DynamoDB from '../lib/dynamo';

export function campaignRepositoryFactory(cuid: () => string, DatabaseService: DatabaseService): CampaignRepository {
  return {
    save(campaign: Campaign) {
      campaign.id = cuid();
      const {error} = validate(campaign, campaignSchemas.schema());
      if (error) {
        throw new Error(`Validation error: ${error}`);
      }

      return DatabaseService.put(campaign);
    },
    async edit(id: string, campaign: Campaign) {
      throw new Error('[500] Method not implemented')
    },
    async get(id: string) {
      throw new Error('[500] Method not implemented')
    },
    async list(userId: string) {
      throw new Error('[500] Method not implemented')
    },
    async delete(userId: string, id: string) {
      return DynamoDB.delete(userId, id);
    }
  }
}

export default campaignRepositoryFactory(cuid, DynamoDB);