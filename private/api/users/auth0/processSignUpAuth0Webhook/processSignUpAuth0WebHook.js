import 'babel-polyfill';
import moment from 'moment';
import omitEmpty from 'omit-empty';
import { User } from '../../../../lib/models/user';

export default function processSignUpAuth0WebHook(userData) {
  const userId = userData.user_id;
  return User.get(userId)
    .then(user => buildUserParams(userData, user))
    .then(userParams => User.update(userParams, userId));
}

function buildUserParams(userData, persistedUser) {
  return new Promise((resolve, reject) => {
    const persistedUserKeys = Object.keys(persistedUser);
    const payload = userData;
    const userId = payload.user_id;
    const email = payload.user_name; // payload.details.body.email;
    const createdAt = moment().unix();
    const userParams = {
      email,
      id: userId,
      createdAt
    };
    const nonPersistedUserParams = Object.keys(omitEmpty(userParams))
      .filter(key => !persistedUserKeys.includes(key))
      .reduce((obj, key) => {
        obj[key] = userParams[key];
        return obj;
      }, {});
    resolve(nonPersistedUserParams);
  });
}
