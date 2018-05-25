import omitEmpty from 'omit-empty';
import { debug } from '../../../lib/index';
import { PaymentLog } from '../../../lib/models/payment_log';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export default function processStripeWebhook(stripeEvent) {
  return stripe.events.retrieve(stripeEvent.id)
    .then(event => createPaymentLog(event));
}

async function createPaymentLog(event) {
  // Only charge. and invoice. events were selected in stripe webhook register interface
  // According to stripe event uniqueness
  // connot be ensured https://stripe.com/docs/webhooks#best-practices
  const payment = await PaymentLog.get(event.id);
  if (payment.id) return Promise.resolve({});
  const customer = await stripe.customers.retrieve(event.data.object.customer);
  // This is the affiliate click_id
  const referredOf = customer.metadata.referredOf;
  const params = omitEmpty({ id: event.id, timestamp: event.created, eventType: event.type, affiliateRef: referredOf, event });
  return PaymentLog.save(params);
}