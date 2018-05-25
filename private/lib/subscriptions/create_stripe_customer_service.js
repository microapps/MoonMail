import omitEmpty from 'omit-empty';
import { Promise } from 'bluebird';
import { logger } from '../index';
import { User } from '../models/user';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class CreateStripeCustomerService {

  static create(userId, stripeToken, clickIdAffiliateRef = null) {
    return new CreateStripeCustomerService(userId, stripeToken, clickIdAffiliateRef).create();
  }

  constructor(userId, stripeToken, clickIdAffiliateRef) {
    this.userId = userId;
    this.stripeToken = stripeToken;
    this.clickIdAffiliateRef = clickIdAffiliateRef;
  }

  create() {
    return User.get(this.userId)
      .then(user => this._doCreate(user))
      .then(customer => this._updateUserDetails(customer))
      .catch((error) => {
        logger().error('= CreateStripeCustomerService.create', error);
        return Promise.reject(error);
      });
  }

  _doCreate(user) {
    return this._createStripeCustomer(omitEmpty({
      source: this.stripeToken, // obtained with Stripe.js
      email: user.email,
      metadata: { referredOf: this.clickIdAffiliateRef }
    }));
  }

  _createStripeCustomer(customer) {
    logger().debug('= CreateStripeCustomerService._createStripeCustomer', customer);
    return stripe.customers.create(customer);
  }

  _updateUserDetails(customer) {
    const defaultSource = customer.default_source;
    const defaultSourceObj = customer.sources.data.find(s => s.id === defaultSource);
    const stripeAccount = {
      customerId: customer.id,
      last4: defaultSourceObj.last4,
      brand: defaultSourceObj.brand,
      name: defaultSourceObj.name,
      country: defaultSourceObj.country,
      cardId: defaultSourceObj.id,
      createdAt: customer.created
    };
    return User.update({ stripeAccount }, this.userId);
  }
}
