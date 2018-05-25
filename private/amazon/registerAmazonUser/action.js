import qs from 'qs';
import omitEmpty from 'omit-empty';
import { logger } from '../../lib/index';
import AmazonSubscriptions from '../lib/amazon_subscriptions';

export default function respond(event, cb) {
  logger().info(JSON.stringify(event));
  const signupUrl = process.env.SIGNUP_URL;
  return getRegistrationToken(omitEmpty(event))
    .then(token => AmazonSubscriptions.resolveCustomer(token))
    .then(azCustomer => {
      logger().info('AZ Customer', azCustomer);
      const url = `${signupUrl}?amazonCustomerId=${azCustomer.CustomerIdentifier}`;
      cb(null, {url});
    })
    .catch((error) => {
      logger().error(error);
      cb(null, {url: signupUrl});
    });
}

function getRegistrationToken(event = {}) {
  return new Promise((resolve, reject) => {
    return event.registrationToken
      ? resolve(event.registrationToken)
      : resolve(getFormToken(event));
  });
}

function getFormToken(event = {}) {
  const formParams = qs.parse(event.formData);
  logger().debug('Form params:', formParams);
  return formParams['x-amzn-marketplace-token'];
}
