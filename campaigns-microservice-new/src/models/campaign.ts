import { Observable } from 'rxjs';
import * as cuid from 'cuid';

import { Campaign } from '../types';
import * as campaignSchemas from './schema/campaign'
import { validate } from './schema/validator';
import { put } from '../lib/dynamo';

export function savePure({cuid, put}): (Campaign) => Observable<Campaign> {
  return (campaign: Campaign) => {
    campaign.id = cuid();
    const {error, value} = validate(campaign, campaignSchemas.schema());
    if (error) {
      throw new Error(`Validation error: ${error}`);
    }

    const params = {
      TableName: process.env.CAMPAIGN_TABLE,
      Item: value
    }

    return put(params);
  }
}

export const save = savePure({cuid, put});