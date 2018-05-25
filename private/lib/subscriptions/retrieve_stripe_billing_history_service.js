import { Promise } from 'bluebird';
import { logger } from '../index';
import { User } from '../models/user';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class RetrieveStripeBillingHistoryService {

  static get(userId, options = {}) {
    return new RetrieveStripeBillingHistoryService(userId, options).get();
  }

  constructor(userId, options) {
    this.userId = userId;
    this.startingAfter = options.startingAfter;
    this.endingBefore = options.endingBefore;
    this.limit = options.limit || 10;
  }

  get() {
    return User.get(this.userId)
      .then(user => this._doRetrieve(user))
      .catch((error) => {
        logger().error('= RetrieveStripeBillingHistoryService.get', error);
        return Promise.reject(error);
      });
  }

  _doRetrieve(user) {
    const params = { customer: user.stripeAccount.customerId };
    if (this.startingAfter) {
      params.starting_after = this.startingAfter;
    }
    if (this.endingBefore) {
      params.ending_before = this.endingBefore;
    }
    params.limit = this.limit;
    return this._retrieveStripeBillingHistory(params);
  }

  _retrieveStripeBillingHistory(params) {
    logger().debug('= RetrieveStripeBillingHistoryService._retrieveStripeBillingHistory', params);
    return stripe.charges.list(params);
  }
}
