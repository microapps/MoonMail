import Promise from 'bluebird';
import moment from 'moment';
import request from 'request-promise';
import parseLinkHeader from 'parse-link-header';
import { User } from '../../../lib/models/user';

export default function listConversions(userId, options) {
  return User.get(userId)
    .then(user => doListConversions(user, options))
    .then((response) => {
      const pagination = parseLinkHeader(response.headers.link);
      return { items: response.body, pagination };
    });
}

function doListConversions(user, opts) {
  const options = Object.assign({}, { pending: 0, dateFrom: moment().subtract(1, 'month').format('YYYY-MM-DD'), dateTo: moment().format('YYYY-MM-DD'), page: 1 }, opts);
  const filterOptions = `&pending=${options.pending}&date_from=${options.dateFrom}&date_to=${options.dateTo}&page=${options.page}`;
  const params = {
    method: 'GET',
    uri: `https://tapfiliate.com/api/1.5/conversions/?program_id=${process.env.TAPFILLIATE_DEFAULT_PROGRAM_ID}&affiliate_id=${user.affiliateId}${filterOptions}`,
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': process.env.TAPFILLIATE_API_KEY
    },
    resolveWithFullResponse: true
  };
  return request(params);
}
