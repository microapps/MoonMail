import request from 'request-promise';
import { debug } from '../../../../lib/index';
import { ApiErrors } from '../../../../lib/errors';
import { User } from '../../../../lib/models/user';
import { NotificationsBus } from '../../../../lib/notifications_bus';

export async function respond(event, cb) {
  try {
    debug('= allocateEndpoint.action', JSON.stringify(event));
    const token = await getAut0Token();
    const sourceId = await getAuth0IdByEmail(token, event.sourceEmail);
    const newId = await getAuth0IdByEmail(token, event.newEmail);
    if (sourceId && newId) {
      const sourceUser = await User.get(sourceId);
      await User.update({ses: sourceUser.ses}, newId);
      cb(null, true);
    }
  } catch(err) {
    console.error(err);
    const subject = 'Could not assign SES credentials';
    const message = `Could not assign SES credentials with event: ${JSON.stringify(event)}`
    await NotificationsBus.publish('emailAdmins', message, subject)
    cb(null, err);
  }
}

async function getAut0Token() {
  const url = `https://${process.env.AUTH0_DOMAIN}/oauth/token`;
  const audience = `https://${process.env.AUTH0_DOMAIN}/api/v2/`;
  const options = {
    method: 'POST',
    url,
    headers: {'content-type': 'application/json'},
    body: {
      client_id: process.env.AUTH0_GLOBAL_CLIENT_ID,
      client_secret: process.env.AUTH0_GLOBAL_CLIENT_SECRET,
      scope: 'read:users read:user_idp_tokens',
      grant_type: 'client_credentials',
      audience
    },
    json: true
  };
  const response = await request(options);
  const token = response.access_token;
  return token;
}

async function getAuth0IdByEmail(accessToken, email) {
  const url = `https://${process.env.AUTH0_DOMAIN}/api/v2/users`;
  const options = {
    method: 'GET',
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    qs: {
      fields: 'user_id,email',
      include_fields: true,
      q: `email:"${email}"`
    },
    json: true
  };
  const results = await request(options);
  return results.find(el => el.email === email).user_id;
}
