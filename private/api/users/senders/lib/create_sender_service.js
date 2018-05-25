'use strict';

import { debug } from '../../../../lib/index';
import { User } from '../../../../lib/models/user';
import { EmailVerifierService } from './email_verifier_service';

class CreateSenderService {

  constructor(emailAddress, userId, fromName) {
    this.emailAddress = emailAddress;
    this.userId = userId;
    this.fromName = fromName;
    this.sender = null;
    this.verifyEmailService = null;
  }

  createSender() {
    debug('= CreateSenderService.createSender', `Creating sender ${this.emailAddress} for ${this.userId}`);
    return User.createSender(this.userId, this.emailAddress, this.fromName)
      .then(newSender => {
        debug('= CreateSenderService.createSender', 'Setting sender to', JSON.stringify(newSender));
        this.newSender = newSender;
      })
      .then(() => this.verifyEmail())
      .then(() => this.enableEmailNotifications())
      .then(() => this.enableEmailNotificationHeaders())
      .then(() => {
        debug('= CreateSenderService.createSender', 'Returning', JSON.stringify(this.newSender));
        return this.newSender;
      });
  }

  get newSender() {
    return this.sender;
  }

  set newSender(sender) {
    this.sender = sender;
  }

  get verifierService() {
    if (!this.verifyEmailService) {
      this.verifyEmailService = new EmailVerifierService(this.emailAddress, {userId: this.userId});
    }
    return this.verifyEmailService;
  }

  verifyEmail() {
    debug('= CreateSenderService.verifyEmail', `Verifying ${this.emailAddress}`);
    return this.verifierService.verify();
  }

  enableEmailNotifications() {
    debug('= CreateSenderService.enableEmailNotifications', `Enabling notifications for ${this.emailAddress}`);
    return this.verifierService.enableNotifications();
  }

  enableEmailNotificationHeaders() {
    debug('= CreateSenderService.enableEmailNotificationHeaders', `Enabling notification headers for ${this.emailAddress}`);
    return this.verifierService.enableNotificationHeaders();
  }
}

module.exports.CreateSenderService = CreateSenderService;
