import { DynamoDB } from 'aws-sdk';
import { DocumentClient, GetItemInput, ScanInput } from 'aws-sdk/clients/dynamodb';
import { DatabaseService, Campaign } from '../types';

export const HASH_KEY = 'userId';
export const RANGE_KEY = 'id';
export const client = new DynamoDB.DocumentClient({
  region: process.env.region
});

export function dynamoFactory(client: DocumentClient): DatabaseService {
  return {
    put (campaign: Campaign) {
      return new Promise((resolve, reject) => {
        client.put(buildDynamoParamObject(campaign), (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(campaign);
        });
      });
    },
    async get(params: GetItemInput) {
      throw new Error('[500] Method not implemented');
    }, // Soon it'll be implemented
    async list(params: ScanInput) {
      throw new Error('[500] Method not implemented');
    },
    async delete(hash: string, range: string) {
      return new Promise((resolve, reject) => {
        client.delete(buildDynamoKeyObject(hash, range), (error) => {
          if (error) {
            reject(error)
          }
          resolve(true)
        })
      });
    }
  }
}

function buildDynamoParamObject(value) {
  return {
    TableName: process.env.CAMPAIGN_TABLE,
    Item: value
  }
}

function buildDynamoKeyObject(hash: string, range: string) {
  return {
    TableName: process.env.CAMPAIGN_TABLE,
    Key: {
      [HASH_KEY]: hash,
      [RANGE_KEY]: range
    }
  };
}


export default dynamoFactory(client);
