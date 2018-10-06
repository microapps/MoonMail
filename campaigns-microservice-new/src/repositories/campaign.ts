import * as cuid from 'cuid';

import { Campaign, DatabaseService, CampaignRepository } from '../types';
import * as campaignSchemas from '../models/schema/campaign'
import { validate } from '../models/schema/validator';
import DynamoDB from '../lib/dynamo';
import { PutItemInput } from 'aws-sdk/clients/dynamodb';

export function campaignRepository(cuid: () => string, DatabaseService: DatabaseService): CampaignRepository {
  return {
    save(campaign: Campaign) {
      campaign.id = cuid();
      const {error, value} = validate(campaign, campaignSchemas.schema());
      if (error) {
        throw new Error(`Validation error: ${error}`);
      }

      const params: PutItemInput = {
        TableName: process.env.CAMPAIGN_TABLE,
        Item: value
      }

      return DatabaseService.put(params);
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
  }
}

export default campaignRepository(cuid, DynamoDB);