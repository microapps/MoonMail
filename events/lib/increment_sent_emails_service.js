import { Report } from 'moonmail-models';
import * as async from 'async';
import { debug } from './index';

class IncrementSentEmailsService {
  constructor(streamRecords) {
    this.streamRecords = streamRecords;
  }

  incrementAll() {
    return new Promise((resolve, reject) => {
      async.forEachOf(this.sentByCampaign, (count, cid, cb) => {
        this.incrementCount(cid, count)
          .then(() => cb())
          .catch(() => cb());
      }, (err) => {
        if (err) {
          debug('= IncrementSentEmailsService.incrementAll', 'Error incrementing clicks', err);
          reject(err);
        } else {
          debug('= IncrementSentEmailsService.incrementAll', 'Successfully incremented clicks');
          resolve('ok');
        }
      });
    });
  }

  incrementCount(campaignId, count = 1) {
    debug('= IncrementSentEmailsService.incrementCount', 'Campaign ID:', campaignId, 'Count:', count);
    return Report.incrementSent(campaignId, count);
  }

  get sentByCampaign() {
    if (this.streamRecords) {
      const sentPerCampaign = {};
      this.streamRecords.forEach((record) => {
        let campaignId = this._getCampaignId(record);
        if (this._isInsert(record) && campaignId) {
          if (sentPerCampaign[campaignId]) {
            sentPerCampaign[campaignId] += 1;
          } else {
            sentPerCampaign[campaignId] = 1;
          }
        }
      });
      return sentPerCampaign;
    }
  }

  _getCampaignId(record) {
    try {
      return record.dynamodb.NewImage.campaignId.S;
    } catch (e) {
      return null;
    }
  }

  _isInsert(record) {
    try {
      return record.eventName === 'INSERT';
    } catch (e) {
      return null;
    }
  }
}

module.exports.IncrementSentEmailsService = IncrementSentEmailsService;
