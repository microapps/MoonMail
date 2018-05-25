import Promise from 'bluebird';
import { User } from '../../../../lib/models/user';
import { EmailVerifierService } from './email_verifier_service';
import { debug } from '../../../../lib/index';

class CheckSenderStatusService {
  constructor(userId, senderId) {
    this.userId = userId;
    this.senderId = senderId;
  }

  checkSender() {
    debug('= CheckSenderStatusService.checkSender', this.userId, this.senderId);
    return User.fetchSender(this.userId, this.senderId, true, false)
      .then(sender => this._checkVerificationStatus(sender));
  }

  _checkVerificationStatus(sender) {
    debug('= CheckSenderStatusService._checkVerificationStatus', JSON.stringify(sender));
    if (sender.verified) {
      debug('= CheckSenderStatusService._checkVerificationStatus', 'Sender is already verified');
      return sender;
    } else {
      debug('= CheckSenderStatusService._checkVerificationStatus', 'Checking status in AWS');
      const verifierService = this._verifierService(sender.emailAddress);
      return verifierService.isVerified()
        .then(verifiedStatus => this._updateSenderStatus(sender, verifiedStatus));
    }
  }

  _updateSenderStatus(sender, verifiedStatus) {
    debug('= CheckSenderStatusService._updateSenderStatus', JSON.stringify(sender));
    if (sender.verified !== verifiedStatus) {
      debug('= CheckSenderStatusService._updateSenderStatus', 'Updating status', sender.verified, verifiedStatus);
      const newSender = Object.assign({}, sender, {verified: verifiedStatus});
      return User.updateSender(this.userId, newSender);
    } else {
      debug('= CheckSenderStatusService._updateSenderStatus', 'Status has not changed');
      return sender;
    }
  }

  _verifierService(email) {
    return EmailVerifierService.create(email, {userId: this.userId});
  }
}

module.exports.CheckSenderStatusService = CheckSenderStatusService;
