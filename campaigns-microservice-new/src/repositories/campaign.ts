import {slug} from 'cuid';

import { Campaign, DatabaseService, CampaignRepository } from '../types';
import * as campaignSchemas from '../models/schema/campaign';
import validate from '../models/schema/validator';
import DynamoDB from './dynamo';

export function campaignRepositoryFactory(cuid: () => string, DatabaseService: DatabaseService): CampaignRepository {
  return {
    save(campaign: Campaign) {
      campaign.id = cuid();
      const {error, value: campaignValidated} = validate(campaign, campaignSchemas.schema());
      if (error) {
        throw new Error(`Validation error: ${error}`);
      }

      return DatabaseService.put(campaignValidated);
    },
    update(campaign: Campaign, userId: string, id: string) {
      const {error, value: campaignValidated} = validate(campaign, campaignSchemas.schema());
      if (error) {
        throw new Error(`Validation error: ${JSON.stringify(error)}`);
      }
      
      return DynamoDB.update(campaignValidated, userId, id);
    },
    async get(id: string) {
      throw new Error('[500] Method not implemented')
    },
    async list(userId: string) {
      throw new Error('[500] Method not implemented')
    },
    delete(userId: string, id: string) {
      return DynamoDB.delete(userId, id);
    }
  };
}

export default campaignRepositoryFactory(slug, DynamoDB);