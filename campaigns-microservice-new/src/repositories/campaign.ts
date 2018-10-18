import {BadRequest} from 'http-errors';
import {QueryOutput} from 'aws-sdk/clients/dynamodb';
import {Model, GetItemOptions} from 'dynogels';

import {Campaign, CampaignRepository, ListOptions} from '../types';
import {Campaign as CampaignSchema} from '../models/schema/campaign';

export function campaignRepositoryFactory(campaignSchema: Model): CampaignRepository {
  return {
    save(campaign: Campaign) {
      return new Promise((resolve, reject) => {
        campaignSchema.create(campaign, function(error, data) {
          if (error) {
            const badRequest = new BadRequest(error.message);
            badRequest.stack = error.stack;
            reject(badRequest)
          } else {
            resolve(<any>data);
          }
        });
      });
    },
    update(campaign: Campaign, userId: string, id: string) {
      return new Promise((resolve, reject) => {
        if (campaign.userId !== userId || campaign.id !== id) {
          reject(new BadRequest('Data does not match'));
          return;
        }
        campaignSchema.update(campaign, function(error, data) {
          if (error) {
            const badRequest = new BadRequest(error.message);
            badRequest.stack = error.stack;
            reject(badRequest)
          } else {
            resolve(<any>data);
          }
        });
      });
    },
    get(userId: string, id: string, fields: Array<string> = []) {
      return new Promise((resolve, reject) => {
        const options: GetItemOptions = {};
        options.AttributesToGet = fields.length ? fields : undefined;

        campaignSchema.get(userId, id, {}, function(error, data) {
          if (error) {
            const badRequest = new BadRequest(error.message);
            badRequest.stack = error.stack;
            reject(badRequest)
          } else {
            resolve(<any>data);
          }
        });
      });
    },
    list(userId: string, {page, limit, fields, filters} = {}) {
      return new Promise(async (resolve, reject) => {
        let queryResult: QueryOutput = {};
        let currentPage = 0;
        try {
          do {
            let query = campaignSchema.query(userId)
              .limit(limit)
              .attributes(fields);

            if (queryResult.LastEvaluatedKey) {
              query = query.startKey(queryResult.LastEvaluatedKey.userId, queryResult.LastEvaluatedKey.id)
            }

            queryResult = await executeQueryAsync(query);
            currentPage++;
          } while(page > currentPage);
          resolve(queryResult.Items);
        } catch(error) {
          reject(error);
        }
      });
    },
    delete(userId: string, id: string) {
      return new Promise((resolve, reject) => {
        campaignSchema.destroy(userId, id, function(error) {
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

function executeQueryAsync(query): Promise<QueryOutput> {
  return new Promise((resolve, reject) => {
    query.exec(function(error, data) {
      if (error) {
        const badRequest = new BadRequest(error.message);
        badRequest.stack = error.stack;
        reject(badRequest)
      } else {
        resolve(data);
      }
    });
  });
}

export default campaignRepositoryFactory(CampaignSchema);