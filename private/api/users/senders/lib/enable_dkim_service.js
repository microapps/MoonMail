import Promise from 'bluebird';
import { User } from '../../../../lib/models/user';
import { SesWrapper } from './ses_wrapper';
import { debug } from '../../../../lib/index';

class EnableDkimService {
  static enable(userId, senderId) {
    return new EnableDkimService(userId, senderId).setEnabled();
  }

  constructor(userId, senderId) {
    this.userId = userId;
    this.senderId = senderId;
  }

  setEnabled() {
    debug('= EnableDkimService.setEnabled', this.userId, this.senderId);
    return User.fetchSender(this.userId, this.senderId, true, false)
      .then(sender => this._setDkimEnabled(sender));
  }

  _setDkimEnabled(sender) {
    debug('= EnableDkimService._setDkimEnabled', JSON.stringify(sender));
    const domain = sender.emailAddress.split('@')[1];
    return this._setIdentityDkimEnabled(domain);
  }

  _setIdentityDkimEnabled(domain) {
    const params = { DkimEnabled: true, Identity: domain };
    return SesWrapper.get(this.userId, this.senderId)
      .then(sesClient => sesClient.setIdentityDkimEnabled(params).promise());
  }
}

module.exports.EnableDkimService = EnableDkimService;
