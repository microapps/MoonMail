const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class FetchStripeSubscription {
  static execute(user, plan) {
    const customer = user.stripeAccount.customerId;
    return stripe.subscriptions.list({customer, plan})
      .then(result => this._findSubscription(result, plan))
      .catch(err => Promise.reject('SubscriptionNotFound'));
  }

  static _findSubscription(result = {data: []}, plan) {
    const subscription = result.data.find(item => {
      try {
        return item.plan.id === plan;
      } catch (err) {
        return false;
      }
    });
    return subscription || Promise.reject('SubscriptionNotFound');
  }
}
