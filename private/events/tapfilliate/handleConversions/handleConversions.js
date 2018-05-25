import Promise from 'bluebird';
import request from 'request-promise';
import { strip } from 'eskimo-stripper';

// We create conversions using clickId (affiliateRef) 
// and map the stripe charge id with externalId in tapfiliate
// so it would be easier to find and dissapprove existing
// conversions on refunded charges.

// https://www.masteringmodernpayments.com/stripe-webhook-event-cheatsheet
// https://stripe.com/docs/api#event_types
export default function handleConversions(streamEvent) {
  const targetEvents = streamEvent.Records
    .filter(record => record.eventName === 'INSERT')
    .map(record => strip(record.dynamodb.NewImage))
    .filter(paymentEvent => isTargetEvent(paymentEvent));
  return createConversions(targetEvents);
}

function isTargetEvent(event) {
  return event.eventType === 'charge.succeeded' && !!event.affiliateRef;
}

function createConversions(events) {
  return Promise.map(events,
    event => createConversion(event.affiliateRef, event.event.data.object.amount, event.event.data.object.id),
    { concurrency: 2 }
  );
}

function createConversion(clickId, amount, externalId) {
  const params = {
    method: 'POST',
    uri: 'https://tapfiliate.com/api/1.5/conversions/?override_max_cookie_time=false',
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.TAPFILLIATE_API_KEY
    },
    body: {
      click_id: clickId,
      amount: amount / 100,
      external_id: externalId
    }
  };
  return request(params);
}

