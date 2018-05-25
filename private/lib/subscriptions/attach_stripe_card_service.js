import { Promise } from 'bluebird';
import { logger } from '../index';
import { User } from '../models/user';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default class AttachStripeCardService {

  static create(userId, stripeToken) {
    return new AttachStripeCardService(userId, stripeToken).create();
  }

  constructor(userId, stripeToken) {
    this.userId = userId;
    this.stripeToken = stripeToken;
  }

  create() {
    return User.get(this.userId)
      .then(user => this._doCreateCard(user))
      .then(userCardDetails => this._setAsDefaultSource(userCardDetails))
      .then(userCustomerDetails => this._updateUserDetails(userCustomerDetails))
      .catch((error) => {
        logger().error('= AttachStripeCardService.create', error);
        return Promise.reject(error);
      });
  }

  _doCreateCard(user) {
    // uses stripeToken obtained with Stripe.js
    return this._createStripeCard(user.stripeAccount.customerId, { source: this.stripeToken })
      .then(cardDetails => Object.assign({}, { cardDetails }, { user }));
  }

  _createStripeCard(customerId, options) {
    logger().debug('= AttachStripeCardService._createStripeCard', customerId, options);
    return stripe.customers.createSource(customerId, options);
  }

  _setAsDefaultSource(userCardDetails) {
    return this._updateCustomerSource(userCardDetails.user.stripeAccount.customerId, { default_source: userCardDetails.cardDetails.id })
      .then(customer => Object.assign({}, { customer }, { user: userCardDetails.user }));
  }

  _updateCustomerSource(customerId, options) {
    logger().debug('= AttachStripeCardService._updateCustomerSource', customerId, options);
    return stripe.customers.update(customerId, options);
  }

  _updateUserDetails(userCustomer) {
    const defaultSource = userCustomer.customer.default_source;
    const customer = userCustomer.customer;
    const defaultSourceObj = customer.sources.data.find(s => s.id === defaultSource);
    const stripeAccount = {
      customerId: customer.id,
      last4: defaultSourceObj.last4,
      brand: defaultSourceObj.brand,
      name: defaultSourceObj.name,
      country: defaultSourceObj.country,
      cardId: defaultSourceObj.id,
      createdAt: customer.created,
      subscriptionId: userCustomer.user.stripeAccount.subscriptionId
    };
    return User.update({ stripeAccount }, this.userId);
  }
}
