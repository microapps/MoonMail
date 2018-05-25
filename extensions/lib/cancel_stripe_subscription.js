import { Promise } from 'bluebird';
import { logger } from './logger';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class CancelStripeSubscription {

  static execute(subscriptionId) {
    return new CancelStripeSubscription(subscriptionId).execute();
  }

  constructor(subscriptionId) {
    this.subscriptionId = subscriptionId;
  }

  execute() {
    return this._cancelStripeSubscription(this.subscriptionId)
      .catch((error) => {
        logger().error('= CancelStripeSubscription.execute', error);
        return Promise.reject(error);
      });
  }

  _cancelStripeSubscription(subscriptionId) {
    logger().debug('= CancelStripeSubscription._cancelStripeSubscription', subscriptionId);
    return stripe.subscriptions.del(subscriptionId);
  }
}
