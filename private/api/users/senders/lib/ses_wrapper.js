import Promise from 'bluebird';
import { User } from '../../../../lib/models/user';
import { SES } from 'aws-sdk';
import { debug } from '../../../../lib/index';

export class SesWrapper {

  static get(userId, senderId) {
    return new SesWrapper(userId, senderId).getSesClient();
  }

  static getDkimStatus(userId, senderId, params) {
    return this.get(userId, senderId)
      .then(sesClient => sesClient.getIdentityDkimAttributes(params).promise());
  }

  static getDomainVerificationStatus(userId, senderId, params) {
    return this.get(userId, senderId)
      .then(sesClient => sesClient.getIdentityVerificationAttributes(params).promise());
  }

  constructor(userId, senderId) {
    this.userId = userId;
    this.senderId = senderId;
    this.sesClient = null;
  }

  getSesClient() {
    debug('= SesWrapper.getSesClient', this.userId);
    if (this.sesClient) {
      return new Promise(resolve => resolve(this.sesClient));
    }
    return this._getUserCredentials()
      .then(creds => Promise.resolve(this._buildSesClient(creds)));
  }

  _getUserCredentials() {
    return new Promise((resolve, reject) => {
      debug('= SesWrapper._getUserCredentials');
      User.get(this.userId)
        .then((user) => {
          this.user = this.user || user;
          if (user.ses) {
            resolve(user.ses);
          } else {
            reject(new Error('User has no Api Keys'));
          }
        });
    });
  }

  _buildSesClient(credentials) {
    debug('= SesWrapper._buildSesClient');
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
