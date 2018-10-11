import { DynamoDB } from 'aws-sdk';
import { DocumentClient, GetItemInput, ScanInput } from 'aws-sdk/clients/dynamodb';

import { DatabaseService, Campaign } from '../types';
import AWSDynamoItemParamBuilder from './aws-dynamoDB-item-param-builder';

export const HASH_KEY = 'userId';
export const RANGE_KEY = 'id';
export const client = new DynamoDB.DocumentClient({
  region: process.env.region
});

export function dynamoFactory(client: DocumentClient): DatabaseService {
  return {
    put (campaign: Campaign) {
      return new Promise((resolve, reject) => {
        const param = new AWSDynamoItemParamBuilder(process.env.CAMPAIGN_TABLE)
          .withItemProperty(campaign)
          .build();

        client.put(param, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(campaign);
        });
      });
    },
    update(campaign: Campaign, hashKey: string, rangeKey: string) {
      return new Promise((resolve, reject) => {
        const param = new AWSDynamoItemParamBuilder(process.env.CAMPAIGN_TABLE)
          .withKeyProperty(HASH_KEY, hashKey, RANGE_KEY, rangeKey)
          .withAttributeUpdatesProperty(campaign)
          .withReturnValuesProperty()
          .build();

        client.update(param, (error, data) => {
          if (error) {
            reject(error)
            return;
          } else {
            resolve(data.Attributes);
          }
        });
      });
    },
    async get(params: GetItemInput) {
      throw new Error('[500] Method not implemented');
    }, // Soon it'll be implemented
    async list(params: ScanInput) {
      throw new Error('[500] Method not implemented');
    },
    async delete(hashKey: string, rangeKey: string) {
      return new Promise((resolve, reject) => {
        const param = new AWSDynamoItemParamBuilder(process.env.CAMPAIGN_TABLE)
          .withKeyProperty(HASH_KEY, hashKey, RANGE_KEY, rangeKey)
          .build();
        client.delete(param, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(true);
          }
        })
      });
    }
  };
}

export default dynamoFactory(client);
