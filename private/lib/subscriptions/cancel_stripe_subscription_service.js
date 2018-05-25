import { Promise } from 'bluebird';
import { logger } from '../index';
import { User } from '../models/user';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class CancelStripeSubscriptionService {

  static cancel(userId) {
    return new CancelStripeSubscriptionService(userId).cancel();
  }

  constructor(userId) {
    this.userId = userId;
  }

  cancel() {
    return User.get(this.userId)
      .then(user => this._doCancel(user))
      .then(userSubscription => this._updateUserDetails(userSubscription))
      .catch((error) => {
        logger().error('= CancelStripeSubscriptionService.cancel', error);
        return Promise.reject(error);
      });
  }

  _doCancel(user) {
    return this._cancelStripeSubscription(user.stripeAccount.customerId)
      .then(subscription => Object.assign({}, { subscription }, { user }));
  }

  _cancelStripeSubscription(customerId) {
    logger().debug('= CancelStripeSubscriptionService._cancelStripeSubscription', customerId);
    // TODO: Improve this!
    // return stripe.customers.cancelSubscription(customerId, { at_period_end: true });
    return stripe.customers.cancelSubscription(customerId);
  }

  _updateUserDetails(userSubscription) {
    const { subscriptionId, ...newStripeData } = userSubscription.user.stripeAccount;
    return User.update({ stripeAccount: newStripeData }, this.userId);
  }
}
