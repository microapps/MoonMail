import { Promise } from 'bluebird';
import { logger } from '../index';
import { User } from '../models/user';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class UpdateStripeSubscriptionService {

  static update(userId, stripePlan) {
    return new UpdateStripeSubscriptionService(userId, stripePlan).update();
  }

  constructor(userId, stripePlan) {
    this.userId = userId;
    this.stripePlan = stripePlan;
  }

  update() {
    return User.get(this.userId)
      .then(user => this._changeSubscriptionPlan(user, this.stripePlan))
      .catch((error) => {
        logger().error('= CreateStripeSubscriptionService.create', error);
        return Promise.reject(error);
      });
  }

  _changeSubscriptionPlan(user, newPlan) {
    logger().debug('= CreateStripeSubscriptionService._changeSubscriptionPlan', user.stripeAccount.subscriptionId, newPlan);
    return stripe.subscriptions.update(user.stripeAccount.subscriptionId, { plan: newPlan });
  }

}
