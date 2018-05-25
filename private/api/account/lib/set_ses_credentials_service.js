import { SesCredentialsValidator } from './ses_credentials_validator';
import { User } from '../../../lib/models/user';

export class SetSesCredentialsService {
  static run(userId, credentials) {
    return SesCredentialsValidator.isValid(credentials)
      .then(quota => this._setCredentials(userId, credentials, quota));
  }

  static _setCredentials(userId, credentials, quota) {
    return User.get(userId)
      .then(user => this._doSetCredentials(userId, user, credentials, quota));
  }

  static _doSetCredentials(userId, user, credentials, quota) {
    const params = {};
    params.ses = Object.assign({}, credentials, {sendingQuota: quota.Max24HourSend});
    if (!user.plan || user.plan === 'free') params.plan = 'free_ses';
    return User.update(params, userId);
  }
}
