import { SES } from 'aws-sdk';
import { SandboxMode } from '../../../lib/errors';
import { debug } from '../../../lib/index';

export class SesCredentialsValidator {

  static isValid(credentials) {
    return this._getQuota(credentials)
      .then(quota => this._checkQuota(quota))
      .catch(error => this._handleError(error));
  }

  static _getQuota(credentials) {
    const params = {
      accessKeyId: credentials.apiKey,
      secretAccessKey: credentials.apiSecret,
      region: credentials.region
    };
    const client = new SES(params);
    return client.getSendQuota().promise();
  }

  static _checkQuota(quota) {
    return new Promise((resolve, reject) => {
      const dailyLimit = quota.Max24HourSend;
      if (dailyLimit > 0 && dailyLimit <= 200) {
        const error = new SandboxMode('The SES account is not in production mode');
        reject(error);
      } else {
        resolve(quota);
      }
    });
  }

  static _handleError(error) {
    return new Promise((resolve, reject) => {
      if (error.name === 'SandboxMode') {
        return reject(error);
      } else {
        debug('= SesCredentialsValidator._handleError', error);
        return reject(Error('Invalid AWS credentials'));
      }
    });
  }
}
