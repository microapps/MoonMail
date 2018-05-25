import * as plans from './billing_plans.json';

const BillingPlans = {
  listsPlans() {
    return plans.items;
  },

  getPlan(planId) {
    return this.listsPlans().find(p => p.id === planId);
  },

  stripePlansMapping: {
    free: process.env.STRIPE_FREE_PLAN,
    free_ses: process.env.STRIPE_FREE_SES_PLAN,
    paid: process.env.STRIPE_STARTER_PLAN,
    paid_ses: process.env.STRIPE_STARTER_SES_PLAN,
    pro: process.env.STRIPE_PRO_PLAN,
    pro_ses: process.env.STRIPE_PRO_SES_PLAN,
    enterprise: process.env.STRIPE_ENTERPRISE_PLAN,
    enterprise_ses: process.env.STRIPE_ENTERPRISE_SES_PLAN
  },

  stripeAnnualPlansMapping: {
    paid: process.env.STRIPE_STARTER_YR_PLAN,
    paid_ses: process.env.STRIPE_STARTER_SES_YR_PLAN,
    pro: process.env.STRIPE_PRO_YR_PLAN,
    pro_ses: process.env.STRIPE_PRO_SES_YR_PLAN,
    enterprise: process.env.STRIPE_ENTERPRISE_YR_PLAN,
    enterprise_ses: process.env.STRIPE_ENTERPRISE_SES_YR_PLAN
  }
};

export default BillingPlans;
