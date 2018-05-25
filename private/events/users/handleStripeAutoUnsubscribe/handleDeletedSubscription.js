import Promise from 'bluebird';
import { strip } from 'eskimo-stripper';
import { User } from '../../../lib/models/user';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

// https://www.masteringmodernpayments.com/stripe-webhook-event-cheatsheet
// https://stripe.com/docs/api#event_types
export default function handleDeletedSubscription(streamEvent) {
  return Promise.map(streamEvent.Records
    .filter(record => record.eventName === 'INSERT')
    .map(record => strip(record.dynamodb.NewImage))
    .filter(paymentEvent => isTargetEvent(paymentEvent)),
    updateUser);
}

function isTargetEvent(event) {
  return event.eventType === 'customer.subscription.deleted';
}

function updateUser(event) {
  return fetchCustomerInformation(event)
    .then(stripeCustomer => User.findByEmail(stripeCustomer.email))
    .then((user) => {
      if (user.plan === gotoPlan(user.plan)) return {};
      return User.update({ plan: gotoPlan(user.plan) }, user.id);
    });
}

function fetchCustomerInformation(event) {
  return stripe.customers.retrieve(event.event.data.object.customer);
}

function gotoPlan(currentPlan) {
  if (currentPlan.match(/_ses/)) return 'free_ses';
  return 'free';
}
