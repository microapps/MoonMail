import omitEmpty from 'omit-empty';
import { logger } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { paramsChecker, errorHandler } from '../../lib/api-utils';
import { newError } from '../../lib/errors';
import { User } from '../../../lib/models/user';
import Auth0Client from '../../../lib/auth0-client';

export async function respond(event, cb) {
  logger().info('= inviteUser.action', JSON.stringify(event));
  const checkParams = paramsChecker(['authToken', 'email']);
  return checkParams(omitEmpty(event))
    .then(params => decrypt(params.authToken))
    .then(decoded => getUsersDetails({mainUserId: decoded.sub,
      invitedUserEmail: event.email}))
    .then(usersDetails => authorizeAccount(usersDetails))
    .then(result => cb(null, result))
    .catch(err => {
      // console.log(err);
      logger().error(err);
      return errorHandler(err, ['UserNotFound'], cb)
    });
}

async function authorizeAccount({mainUser, mainUserAuth0, invitedUser, invitedUserAuth0}) {
  logger().debug('= authorizeAccount', JSON.stringify({mainUser, mainUserAuth0, invitedUser, invitedUserAuth0}));
  const authorizationFromUser = (user) => ({userId: user.user_id, email: user.email, picture: user.picture, name: user.name});
  const authorizations = (mainUser.authorizations || []).concat(authorizationFromUser(invitedUserAuth0));
  const impersonations = (invitedUser.impersonations || []).concat(authorizationFromUser(mainUserAuth0));
  const updatedMain = await User.update({authorizations}, mainUser.id);
  const updatedInvited = await User.update({impersonations}, invitedUser.id);
  return {authorizations};
}

async function getUsersDetails({mainUserId, invitedUserEmail}) {
  logger().debug('= getUsersDetails', JSON.stringify({mainUserId, invitedUserEmail}));
  const mainUser = await User.get(mainUserId);
  const auth0Creds = getAuth0Credentials();
  const mainUserAuth0 = await Auth0Client.query('getUser', {id: mainUserId, fields: ['user_id', 'email', 'name', 'picture']}, auth0Creds);
  logger().debug('= getUsersDetails: mainUserAuth0', JSON.stringify(mainUserAuth0));
  const invitedUserAuth0 = await getAuth0UserByEmail(invitedUserEmail);
  logger().debug('= getUsersDetails: invitedUserAuth0', JSON.stringify(invitedUserAuth0));
  if (!(invitedUserAuth0 && invitedUserAuth0.user_id)) throw newError('UserNotFound', `There is no account with email address ${invitedUserEmail}`)
  const invitedUser = await User.get(invitedUserAuth0.user_id);
  return {mainUser, mainUserAuth0, invitedUser, invitedUserAuth0};
}

async function getAuth0UserByEmail(email) {
  logger().debug('= getAuth0UserByEmail', email);
  const auth0Creds = getAuth0Credentials();
  return Auth0Client
    .query(
      'getUsers',
      {q: `email:"${email}"`, fields: ['user_id', 'email', 'name', 'picture']},
      auth0Creds
    )
    .then(res => res.find(el => el.email === email));
}

function getAuth0Credentials() {
  return {
    clientId: process.env.AUTH0_GLOBAL_CLIENT_ID,
    clientSecret: process.env.AUTH0_GLOBAL_CLIENT_SECRET,
    baseUrl: process.env.AUTH0_DOMAIN
  };
}
