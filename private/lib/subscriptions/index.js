import BillingPlans from './billing_plans';
import CancelStripeSubscriptionService from './cancel_stripe_subscription_service';
import CreateStripeCustomerService from './create_stripe_customer_service';
import { User } from '../models/user';
import SES from '../ses/index';
import { GetUserAccountService } from '../../api/users/account/lib/get_user_account_service';
import UpdateStripeSubscriptionService from './update_stripe_subscription_service';
import CreateStripeSubscriptionService from './create_stripe_subscription_service';
import RetrieveStripeBillingHistoryService from './retrieve_stripe_billing_history_service';
import LimitsValidationService from './limits_validation_service';
import ChargeEmailsService from './charge_emails_service';
import AttachStripeCardService from './attach_stripe_card_service';

// TODO:
// Improve naming of totalRecipients/recipientsCount/sentCampaingsInLastDay
// is totally confusing

const validateFreeSubscriptionLimits = LimitsValidationService.generate({
  totalRecipients: BillingPlans.getPlan('free').limits.recipientsInTotal || Infinity,
  recipientsCount: BillingPlans.getPlan('free').limits.recipientsPerCampaign || Infinity,
  sentCampaignsInLastDay: BillingPlans.getPlan('free').limits.campaignsPerDay || Infinity
});

const validateFreeSESSubscriptionLimits = LimitsValidationService.generate({
  totalRecipients: BillingPlans.getPlan('free_ses').limits.recipientsInTotal || Infinity,
  recipientsCount: BillingPlans.getPlan('free_ses').limits.recipientsPerCampaign || Infinity,
  sentCampaignsInLastDay: BillingPlans.getPlan('free_ses').limits.campaignsPerDay || Infinity
});

const validateStaffSubscriptionLimits = LimitsValidationService.generate({
  totalRecipients: BillingPlans.getPlan('staff').limits.recipientsInTotal || Infinity,
  recipientsCount: BillingPlans.getPlan('staff').limits.recipientsPerCampaign || Infinity,
  sentCampaignsInLastDay: BillingPlans.getPlan('staff').limits.campaignsPerDay || Infinity
});

const StarterLimitsValidationService = LimitsValidationService.generate({
  totalRecipients: BillingPlans.getPlan('paid').limits.recipientsInTotal || Infinity,
  recipientsCount: BillingPlans.getPlan('paid').limits.recipientsPerCampaign || Infinity,
  sentCampaignsInLastDay: BillingPlans.getPlan('paid').limits.campaignsPerDay || Infinity
});

const ProLimitsValidationService = LimitsValidationService.generate({
  totalRecipients: BillingPlans.getPlan('pro').limits.recipientsInTotal || Infinity,
  recipientsCount: BillingPlans.getPlan('pro').limits.recipientsPerCampaign || Infinity,
  sentCampaignsInLastDay: BillingPlans.getPlan('pro').limits.campaignsPerDay || Infinity
});

const EnterpriseLimitsValidationService = LimitsValidationService.generate({
  totalRecipients: BillingPlans.getPlan('enterprise').limits.recipientsInTotal || Infinity,
  recipientsCount: BillingPlans.getPlan('enterprise').limits.recipientsPerCampaign || Infinity,
  sentCampaignsInLastDay: BillingPlans.getPlan('enterprise').limits.campaignsPerDay || Infinity
});

const AwsMarketplaceBasicLimitsValidationService = LimitsValidationService.generate({
  totalRecipients: BillingPlans.getPlan('aws_saas_marketplace_basic').limits.recipientsInTotal || Infinity,
  recipientsCount: BillingPlans.getPlan('aws_saas_marketplace_basic').limits.recipientsPerCampaign || Infinity,
  sentCampaignsInLastDay: BillingPlans.getPlan('aws_saas_marketplace_basic').limits.campaignsPerDay || Infinity
});

const AwsMarketplaceProLimitsValidationService = LimitsValidationService.generate({
  totalRecipients: BillingPlans.getPlan('aws_saas_marketplace_pro').limits.recipientsInTotal || Infinity,
  recipientsCount: BillingPlans.getPlan('aws_saas_marketplace_pro').limits.recipientsPerCampaign || Infinity,
  sentCampaignsInLastDay: BillingPlans.getPlan('aws_saas_marketplace_pro').limits.campaignsPerDay || Infinity
});

const NullChargeEmailsService = () => (userId, campaign, currentState) => ({ perform: () => { } });

const Subscriptions = {
  freePlan: 'free',
  freeSesPlan: 'free_ses',

  billingPlans: BillingPlans,

  planRequirements: {
    limitValidators: {
      staff: validateStaffSubscriptionLimits,
      free: validateFreeSubscriptionLimits,
      free_ses: validateFreeSESSubscriptionLimits,
      paid: StarterLimitsValidationService,
      paid_ses: StarterLimitsValidationService,
      pro: ProLimitsValidationService,
      pro_ses: ProLimitsValidationService,
      enterprise: EnterpriseLimitsValidationService,
      enterprise_ses: EnterpriseLimitsValidationService,
      aws_saas_marketplace_basic: AwsMarketplaceBasicLimitsValidationService,
      aws_saas_marketplace_pro: AwsMarketplaceProLimitsValidationService
    },
    emailChargers: {
      staff: NullChargeEmailsService(),
      free: NullChargeEmailsService(),
      free_ses: NullChargeEmailsService(),
      paid: ChargeEmailsService.generate(0),
      paid_ses: ChargeEmailsService.generate(0),
      pro: ChargeEmailsService.generate(0),
      pro_ses: ChargeEmailsService.generate(0),
      enterprise: ChargeEmailsService.generate(0),
      enterprise_ses: ChargeEmailsService.generate(0),
      aws_saas_marketplace_basic: NullChargeEmailsService(),
      aws_saas_marketplace_pro: NullChargeEmailsService()
    }
  },

  updateUserSubscription(userId, newPlan, subscriptionType, token, clickId = null) {
    return User.get(userId)
      .then(user => this.handleUserSubscription(user, newPlan, subscriptionType, token, clickId));
  },

  handleUserSubscription(user, newPlan, subscriptionType, token, clickId) {
    const userPlan = user.plan || 'free';
    if (userPlan === newPlan) return GetUserAccountService.userToAccount(user.id, user);
    return Promise.resolve(user)
      .then(user => this.prepareCustomer(user, token, clickId))
      .then(user => this.updateSubscription(user, newPlan, subscriptionType, token, clickId))
      .then(user => SES.assignCredentials(user))
      .then(user => GetUserAccountService.userToAccount(user.id, user))
      .catch(error => Promise.reject(this.handleStripeErrors(error)));
  },

  isADowngrade(newPlan) {
    return newPlan === this.freePlan || newPlan === this.freeSesPlan;
  },

  updateSubscription(user, newPlan, subscriptionType, token, clickId) {
    return this.isADowngrade(newPlan)
      ? this.downgrade(user)
      : this.updateSubscriptionPlan(user, newPlan, subscriptionType, token, clickId);
  },

  downgrade(user) {
    const userToUpdate = Object.assign({}, { plan: 'free' }, user);
    if (userToUpdate.plan.match(/free/)) return Promise.resolve(userToUpdate);
    const gotoPlan = userToUpdate.plan.match(/ses/) ? 'free_ses' : 'free';
    return CancelStripeSubscriptionService.cancel(userToUpdate.id)
      .then(_ => User.updatePlan(userToUpdate.id, gotoPlan));
  },

  updateSubscriptionPlan(user, newPlan, subscriptionType, token, clickId) {
    return this.createOrUpdateSubscription(user, newPlan, subscriptionType, token)
      .then(_ => User.updatePlan(user.id, newPlan));
  },

  prepareCustomer(user, token, clickId) {
    return this.getOrCreateCustomer(user, token, clickId)
      .then(_ => user);
  },

  getOrCreateCustomer(user, token, clickId) {
    if (user.stripeAccount && (user.stripeAccount || {}).customerId) return Promise.resolve(user.stripeAccount);
    return CreateStripeCustomerService.create(user.id, token, clickId);
  },

  createOrUpdateSubscription(user, newPlan, subscriptionType) {
    const stripePlan = subscriptionType === 'annual' ? BillingPlans.stripeAnnualPlansMapping[newPlan] : BillingPlans.stripePlansMapping[newPlan];
    if (user.stripeAccount && (user.stripeAccount || {}).subscriptionId) {
      return UpdateStripeSubscriptionService.update(user.id, stripePlan);
    }
    return CreateStripeSubscriptionService.create(user.id, stripePlan);
  },

  getBillingHistory(userId, params) {
    return RetrieveStripeBillingHistoryService.get(userId, params);
  },

  attachUserCard(userId, token) {
    return AttachStripeCardService.create(userId, token)
      .then(user => GetUserAccountService.userToAccount(userId, user));
  },

  handleStripeErrors(error) {
    if (!error.type) return error;
    switch (error.type) {
      case 'StripeCardError':
        // A declined card error
        return { name: 'PaymentGatewayError', message: error.message };
      case 'StripeInvalidRequestError':
        // Invalid parameters were supplied to Stripe's API
        return { name: 'UnexpectedPaymentGatewayError' };
      case 'StripeAPIError':
        // An error occurred internally with Stripe's API
        return { name: 'UnexpectedPaymentGatewayError' };
      case 'StripeConnectionError':
        // Some kind of error occurred during the HTTPS communication
        return { name: 'UnexpectedPaymentGatewayError' };
      case 'StripeAuthenticationError':
        // You probably used an incorrect API key
        return { name: 'UnexpectedPaymentGatewayError' };
      default:
        return error;
    }
  }
};

export default Subscriptions;
