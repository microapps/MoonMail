import Promise from 'bluebird';
import request from 'request-promise';
import parseLinkHeader from 'parse-link-header';
import { User } from '../../../lib/models/user';

export default function listPayouts(userId, options) {
  return User.get(userId)
    .then(user => doListPayouts(user, options))
    .then((response) => {
      const pagination = parseLinkHeader(response.headers.link);
      return { items: response.body, pagination };
    });
}

function doListPayouts(user, opts) {
  const options = Object.assign({}, { page: 1 }, opts);
  const params = {
    method: 'GET',
    uri: `https://tapfiliate.com/api/1.5/affiliates/${user.affiliateId}/payouts/?page=${options.page}`,
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.TAPFILLIATE_API_KEY
    },
    resolveWithFullResponse: true
  };
  return request(params);
}
