import { Campaign } from 'moonmail-models';
import { DeliverScheduledCampaignService } from './deliver_scheduled_campaign_service';
import { User } from '../../../../lib/models/user';
import { debug } from '../../../../lib/index';
import isEmpty from 'is-empty';
import * as async from 'async';

export class DeliverScheduledCampaignsService {
  constructor(snsClient) {
    this.snsClient = snsClient;
  }

  execute() {
    return this._fetchScheduledCampaigns()
      .then(scheduledCampaigns => this._groupCampaignsByUser(scheduledCampaigns))
      .then(campaignsByUser => this._deliverCampaigns(campaignsByUser));
  }

  _fetchScheduledCampaigns() {
    debug('= DeliverScheduledCampaignsService._fetchScheduledCampaigns');
    return Campaign.scheduledInPast();
  }

  _groupCampaignsByUser(campaigns) {
    return new Promise((resolve, reject) => {
      debug('= DeliverScheduledCampaignsService._groupCampaignsByUser', JSON.stringify(campaigns));
      const userIds = [...new Set(campaigns.map(c => c.userId))];
      async.reduce(userIds, {}, (memo, userId, callback) => {
        return this._fetchUser(userId)
          .then(user => {
            memo[userId] = {
              user,
              campaigns: campaigns.filter(el => el.userId === userId)
            };
            return callback(null, memo);
          })
          .catch(() => callback());
      }, (err, result) => {
        if (err) return reject(err);
        else return resolve(result);
      });
    });
  }

  _fetchUser(userId) {
    return User.get(userId)
      .then(user => {
        if (isEmpty(user)) return {id: userId, plan: 'free'};
        else return user;
      });
  }

  _deliverCampaigns(campaignsByUser) {
    return new Promise((resolve, reject) => {
      debug('= DeliverScheduledCampaignsService._deliverCampaigns', JSON.stringify(campaignsByUser));
      const deliverServicesByUser = this._createDeliverServicesByUser(campaignsByUser);
      const userIds = Object.keys(deliverServicesByUser);
      async.each(userIds, (userId, cb) => {
        const userDeliverServices = deliverServicesByUser[userId];
        this._deliverUserCampaigns(userDeliverServices)
          .then(() => cb())
          .catch(() => cb());
      }, err => {
        if (err) return reject(err);
        else return resolve(true);
      });
    });
  }

  _deliverUserCampaigns(deliverServices) {
    return new Promise((resolve, reject) => {
      async.eachSeries(deliverServices, (deliverService, cb) => {
        setTimeout(() => {
          deliverService.sendCampaign()
            .then(() => cb())
            .catch(() => cb());
        }, 600);
      }, (err, res) => {
        if (err) return reject(err);
        else return resolve(true);
      });
    });
  }

  _createDeliverServicesByUser(campaignsByUser) {
    const userIds = Object.keys(campaignsByUser);
    return userIds.reduce((acumm, userId) => {
      const user = campaignsByUser[userId].user;
      const campaigns = campaignsByUser[userId].campaigns;
      acumm[userId] = campaigns.map(c => this._createDeliverService(user, c.id));
      return acumm;
    }, {});
  }

  _createDeliverService(user, campaignId) {
    return new DeliverScheduledCampaignService(this.snsClient, {user, campaignId});
  }
}
