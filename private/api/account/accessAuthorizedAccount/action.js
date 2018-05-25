import request from 'request-promise';
import omitEmpty from 'omit-empty';
import { debug } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler } from '../../lib/api-utils';
import errors from '../../lib/errors';
import { User } from '../../../lib/models/user';

export async function respond(event, cb) {
  debug('= accessAuthorizedAccount.action', JSON.stringify(event));
  const checkParams = paramsChecker(['authToken', 'userId']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => authorize(decoded.sub, decodeURIComponent(event.userId)))
    .then(userIds => impersonate(userIds, event))
    .then(url => cb(null, {url}))
    .catch(err => {
      console.error(err);
      return errorHandler(err, [], cb)
    });
}

async function authorize(mainUserId, impersonateUserId) {
  const mainUser = await User.get(mainUserId);
  const impersonatedUser = (mainUser.impersonations || []).find(u => u.userId === impersonateUserId);
  return impersonatedUser ? Promise.resolve({mainUserId, impersonateUserId}) : Promise.reject(errors.NotAuthorized)
}

function impersonate({mainUserId, impersonateUserId}, options = {}) {
  return getAut0Token()
    .then(token => getImpersonationUrl(token, impersonateUserId, options))
}

async function getAut0Token() {
  const url = `https://${process.env.AUTH0_DOMAIN}/oauth/token`;
  const options = {
    method: 'POST',
    url,
    headers: {'content-type': 'application/json'},
    body: {
      client_id: process.env.AUTH0_GLOBAL_CLIENT_ID,
      client_secret: process.env.AUTH0_GLOBAL_CLIENT_SECRET,
      grant_type: 'client_credentials'
    },
    json: true
  };
  const response = await request(options);
  const token = response.access_token;
  return token;
}

function getImpersonationUrl(accessToken, userId, opt = {}) {
  const url = `https://${process.env.AUTH0_DOMAIN}/users/${userId}/impersonate`;
  const callbackHost = opt.origin ? decodeURIComponent(opt.origin) : 'https://app.moonmail.io';
  const callbackUrl = `${callbackHost}/signin`;
  const options = {
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: {
      protocol: 'oauth2',
      impersonator_id: userId,
      client_id: process.env.AUTH0_MM_CLIENT_ID,
      additionalParameters: {
        response_type: 'token',
        state: '',
        callback_url: callbackUrl,
        scope: 'openid'
      }
    },
    json: true
  };
  return request(options);
}
