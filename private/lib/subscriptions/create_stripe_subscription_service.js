import { Promise } from 'bluebird';
import { logger } from '../index';
import { User } from '../models/user';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class CreateStripeSubscriptionService {

  static create(userId, stripePlan) {
    return new CreateStripeSubscriptionService(userId, stripePlan).create();
  }

  constructor(userId, stripePlan) {
    this.userId = userId;
    this.stripePlan = stripePlan;
  }

  create() {
    return User.get(this.userId)
      .then(user => this._doCreate(user))
      .then(userSubscription => this._saveCustomerSubscriptionDetails(userSubscription))
      .catch((error) => {
        logger().error('= CreateStripeSubscriptionService.create', error);
        return Promise.reject(error);
      });
  }

  _doCreate(user) {
    return this._createStripeSubscription({
      customer: user.stripeAccount.customerId, // obtained with Stripe.js
      plan: this.stripePlan
    }).then(subscription => Object.assign({}, { subscription }, { user }));
  }

  _createStripeSubscription(subscription) {
    logger().debug('= CreateStripeSubscriptionService._createStripeSubscription', subscription);
    return stripe.subscriptions.create(subscription);
  }

  _saveCustomerSubscriptionDetails(userSubscription) {
    const stripeAccountWithSubId = {
      subscriptionId: userSubscription.subscription.id
    };
    const newStripeAccount = Object.assign({}, userSubscription.user.stripeAccount, stripeAccountWithSubId);
    return User.update({ stripeAccount: newStripeAccount }, this.userId);
  }
}
