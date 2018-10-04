import { DynamoDB } from 'aws-sdk';
import { Observable } from 'rxjs';

import { Campaign } from '../types';

export const client = new DynamoDB.DocumentClient({
  region: process.env.region
});

export function putPure(client): (params: any) => Promise<Campaign> {
  return (params: any) => {
    return new Promise((resolve, reject) => {
      client.put(params, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(params.Item);
      });
    });
  }
}
export const put = putPure(client);
