import { DynamoDB } from 'aws-sdk';
import { DocumentClient, PutItemInput, GetItemInput, ScanInput } from 'aws-sdk/clients/dynamodb';
import { DatabaseService } from '../types';

export const client = new DynamoDB.DocumentClient({
  region: process.env.region
});

export function dynamoService(client: DocumentClient): DatabaseService {
  return {
    put (params: PutItemInput) {
      return new Promise((resolve, reject) => {
        client.put(params, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(params.Item);
        });
      });
    },
    async get(params: GetItemInput) {
      throw new Error('[500] Method not implemented')
    }, // Soon it'll be implemented
    async list(params: ScanInput) {
      throw new Error('[500] Method not implemented')
    }
  }
}

export default dynamoService(client);
