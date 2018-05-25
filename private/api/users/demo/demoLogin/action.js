import request from 'request-promise';
import { ApiErrors } from '../../../../lib/errors';

export async function respond(event, cb) {
  const token = await getAut0Token();
  const impersonateUrl = await getDemoLoginUrl(token);
  return cb(null, {url: impersonateUrl});
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

async function getDemoLoginUrl(accessToken) {
  const demoUserId = process.env.DEMO_USER_ID;
  const url = `https://${process.env.AUTH0_DOMAIN}/users/${demoUserId}/impersonate`;
  const callbackUrl = 'https://app.moonmail.io/signin';
  const options = {
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: {
      protocol: 'oauth2',
      impersonator_id: demoUserId,
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
  const response = await request(options)
  return response;
}
