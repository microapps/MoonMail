import { Promise } from 'bluebird';
import { logger } from './logger';
import { User } from './models/user';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class CreateStripeSubscription {

  static execute(userId, stripePlan) {
    return new CreateStripeSubscription(userId, stripePlan).execute();
  }

  constructor(userId, stripePlan) {
    this.userId = userId;
    this.stripePlan = stripePlan;
  }

  execute() {
    return User.get(this.userId)
      .then(user => this._doCreate(user))
      .catch((error) => {
        logger().error('= CreateStripeSubscription.execute', error);
        return Promise.reject(error);
      });
  }

  _doCreate(user = {}) {
    return user.stripeAccount
      ? this._createStripeSubscription({
          customer: user.stripeAccount.customerId, // obtained with Stripe.js
          plan: this.stripePlan
        })
      : Promise.reject('NoPaymentDetails');
  }

  _createStripeSubscription(subscription) {
    logger().debug('= CreateStripeSubscription._createStripeSubscription', subscription);
    return stripe.subscriptions.create(subscription);
  }
}
