import { Promise } from 'bluebird';
import { logger } from '../index';
import { User } from '../models/user';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class RetrieveStripeSubscriptionService {

  static get(userId) {
    return new RetrieveStripeSubscriptionService(userId).get();
  }

  constructor(userId) {
    this.userId = userId;
  }

  get() {
    return this._getUser()
      .then(user => this._doRetrieve(user))
      .catch((error) => {
        logger().error('= RetrieveStripeSubscriptionService.get', error);
        return Promise.reject(error);
      });
  }

  _getUser() {
    return User.get(this.userId);
  }

  _doRetrieve(user) {
    return this._retrieveStripeSubscription(user.stripeAccount.customerId, user.stripeAccount.subscriptionId)
      .then(subscription => Object.assign({}, { subscription }, { user }));
  }

  _retrieveStripeSubscription(customerId, subscriptionId) {
    logger().debug('= RetrieveStripeSubscriptionService._retrieveStripeSubscription', customerId);
    return stripe.customers.retrieveSubscription(customerId, subscriptionId);
  }
}
