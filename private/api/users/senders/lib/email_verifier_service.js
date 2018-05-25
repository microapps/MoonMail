import Promise from 'bluebird';
import { SES } from 'aws-sdk';
import { _ } from 'lodash';
import { User } from '../../../../lib/models/user';
import { debug } from '../../../../lib/index';

class EmailVerifierService {

  static create(email, { userId, user } = {}) {
    return new EmailVerifierService(email, { userId, user });
  }

  constructor(email, { userId, user } = {}) {
    this.userId = userId;
    this.user = user;
    this.email = email;
    this.sesClient = null;
  }

  verify() {
    debug('= EmailVerifierService.verify', this.email);
    return this._getSesClient()
      .then(sesClient => sesClient.verifyEmailIdentity({ EmailAddress: this.email }).promise());
  }

  isVerified() {
    debug('= EmailVerifierService.isVerified', this.email);
    return this._getSesClient()
      .then(sesClient => sesClient.getIdentityVerificationAttributes(this._sesVerificationParams()).promise())
      .then(verificationResult => this._checkVerification(verificationResult));
  }

  enableNotifications() {
    debug('= EmailVerifierService.enableNotifications', this.email);
    return this._enableNotification('Bounce')
      .then(() => this._enableNotification('Complaint'))
      .then(() => this._enableNotification('Delivery'));
  }

  _notificationParams(type) {
    return { Identity: this.email, NotificationType: type, SnsTopic: this.notificationsTopicArn(type) };
  }

  _enableNotification(type) {
    debug('= EmailVerifierService._enableNotification', this.email, type);
    const params = this._notificationParams(type);
    return this._getSesClient()
      .then(sesClient => sesClient.setIdentityNotificationTopic(params).promise());
  }

  enableNotificationHeaders() {
    const types = ['Bounce', 'Complaint', 'Delivery'];
    return Promise.map(types, type => this._enableNotificationHeaders(type), { concurrency: 1 })
  }

  _enableNotificationHeaders(type) {
    const params = { Identity: this.email, NotificationType: type, Enabled: true };
    return this._getSesClient()
      .then(sesClient => sesClient.setIdentityHeadersInNotificationsEnabled(params).promise());
  }

  notificationsTopicArn(type) {
    const topics = type === 'Delivery'
      ? process.env.EMAIL_DELIVERIES_TOPICS.toString().split(',')
      : process.env.EMAIL_NOTIFICATIONS_TOPICS.toString().split(',');
    const senderRegion = this.user.ses.region;
    const topic = _.find(topics, t => t.includes(senderRegion));
    return topic;
  }

  _checkVerification(result) {
    debug('= EmailVerifierService._checkVerification', JSON.stringify(result));
    try {
      return result.VerificationAttributes[this.email].VerificationStatus === 'Success';
    } catch (e) {
      debug('= EmailVerifierService._checkVerification', 'Error', e);
      return false;
    }
  }

  _sesVerificationParams() {
    return {Identities: [this.email]};
  }

  _getSesClient() {
    debug('= EmailVerifierService._getSesClient', this.userId);
    if (this.sesClient) return new Promise(resolve => resolve(this.sesClient));
    return this._getUserCredentials()
      .then(creds => this._buildSesClient(creds));
  }

  _getUserCredentials() {
    return new Promise((resolve, reject) => {
      debug('= EmailVerifierService._getUserCredentials');
      User.get(this.userId)
        .then((user) => {
          this.user = this.user || user;
          return user.ses ? resolve(user.ses) : reject(new Error('User has no Api Keys'));
        });
    });
  }

  _buildSesClient(credentials) {
    debug('= EmailVerifierService._buildSesClient');
    const params = this._sesClientParams(credentials);
    this.sesClient = new SES(params);
    return this.sesClient;
  }

  _sesClientParams(ses) {
    return {
      accessKeyId: ses.apiKey,
      secretAccessKey: ses.apiSecret,
      region: ses.region
    };
  }
}

module.exports.EmailVerifierService = EmailVerifierService;
