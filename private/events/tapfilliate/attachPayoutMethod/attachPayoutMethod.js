import Promise from 'bluebird';
import request from 'request-promise';
import { User } from '../../../lib/models/user';
import { strip } from 'eskimo-stripper';

export default function attachPayoutMethod(event) {
  const usersWithPaymentMethod = event.Records
    .filter(record => record.eventName === 'MODIFY')
    .map(record => strip(record.dynamodb.NewImage))
    .filter(user => affiliateWithPaypalAddress(user));

  return attachPayoutMethodBatch(usersWithPaymentMethod);
}

function affiliateWithPaypalAddress(user) {
  // tapFilliatePayoutMethodSet is a workaround because tapfilliate dont have 
  // a way to restrieve payouts methods
  return !!user.payPalEmail && !!user.affiliateId && !user.tapFilliatePayoutMethodSet;
}

function attachPayoutMethodBatch(users) {
  return Promise.map(users,
    user => attachPayoutMethodAndCache(user),
    { concurrency: 2 });
}

function attachPayoutMethodAndCache(user) {
  return doAttachPayoutMethod(user)
    .then(_ => User.update({ tapFilliatePayoutMethodSet: true }, user.id));
}

function doAttachPayoutMethod(user) {
  const params = {
    method: 'PUT',
    uri: `https://tapfiliate.com/api/1.5/affiliates/${user.affiliateId}/payout-methods/paypal/`,
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.TAPFILLIATE_API_KEY
    },
    body: {
      paypal_address: user.payPalEmail
    }
  };
  return request(params);
}
