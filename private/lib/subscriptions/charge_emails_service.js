import { logger } from '../index';
import { User } from '../models/user';
import ReputationControls from '../reputation/index';
import Subscriptions from './index';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

// Currently not used
const STRIPE_MINIMUM_CHARGEABLE_AMOUNT = 70;
//

const costPerReputation = ReputationControls.emailCostsPerReputation;

export default class ChargeEmailsService {

  static generate(freeEmails = 0) {
    return (userId, campaign, currentState) => new ChargeEmailsService(userId, campaign, currentState, freeEmails);
  }

  constructor(userId, campaign, currentState, freeEmails = 0) {
    this.userId = userId;
    this.campaign = campaign;
    this.recipientsCount = currentState.recipientsCount;
    this.freeEmails = freeEmails;
  }

  perform() {
    logger().debug('= ChargeEmailsService.charge', this.userId);
    return User.get(this.userId)
      .then(user => this._doCharge(user.stripeAccount.customerId, user, user.customPrice));
  }

  _doCharge(customerId, user, customPrice = null) {
    if (user.plan.match(/free/)) return Promise.resolve(true);
    const perEmailRate = parseInt(customPrice || costPerReputation(user.reputationData.reputation, user.reputationData.sentEmails || 0));
    const emailsToCharge = this.recipientsCount - this.freeEmails;
    if (emailsToCharge > 0) {
      // Rule1: Always ceil to upper 1000 rates
      // ie: 2 emails will cost the same as 1000
      // and 1001 will cost the same as 2000
      //
      // First 2000 emails will always be charged at 2.99
      // > 2000 emails will be charged first 2000 at 2.99 + the rest
      // following Rule1
      const thousandCeiled = Math.ceil((emailsToCharge - 2000 > 0 ? emailsToCharge - 2000 : 0) / 1000) * 1000;
      // const toCharge = Math.max(thousandCeiled * perEmailRate / 1000, this._minimumChargeableAmount(userPlan));
      const toCharge = 499 + thousandCeiled * perEmailRate / 1000;
      return this._createStripeCharge({
        amount: toCharge, // amount in cents
        currency: 'usd',
        customer: customerId,
        description: this._chargeDescription()
      });
    } else {
      return Promise.resolve(true);
    }
  }

  // _minimumChargeableAmount(userPlan) {
  //   // Stripe minimum chargeable ammount is $0.50
  //   // https://support.stripe.com/questions/what-is-the-minimum-amount-i-can-charge-with-stripe
  //   return Math.max(this._costPerPlan(userPlan), STRIPE_MINIMUM_CHARGEABLE_AMOUNT);
  // }

  _createStripeCharge(charge) {
    logger().info('= ChargeEmailsService._createStripeCharge', charge);
    return stripe.charges.create(charge)
      .catch(error => Promise.reject(Subscriptions.handleStripeErrors(error)));
  }

  _chargeDescription() {
    return `Charge for campaign with subject "${this.campaign.subject}" with ${this.recipientsCount} recipient(s)`;
  }
}
