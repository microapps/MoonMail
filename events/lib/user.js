import { Model, Report } from 'moonmail-models';
import cuid from 'cuid';
import omitEmpty from 'omit-empty';

class User extends Model {

  static get tableName() {
    return process.env.USERS_TABLE;
  }

  static get hashKey() {
    return 'id';
  }

  static get emailIndex() {
    return process.env.EMAIL_INDEX;
  }

  static get amazonCustomerIndex() {
    return process.env.AMAZON_CUSTOMER_INDEX;
  }

  static get apiKeyIndex() {
    return process.env.API_KEY_INDEX;
  }

  static listSenders(userId) {
    return this.get(userId)
      .then(user => this._listSendersResponse(user));
  }

  static checkPhoneUnique(phoneNumber) {
    const params = {
      TableName: this.tableName,
      FilterExpression: 'phoneNumber = :phoneNumber AND phoneVerified = :verified',
      ExpressionAttributeValues: { ':phoneNumber': phoneNumber, ':verified': true },
      Select: 'COUNT'
    };
    return this._client('scan', params)
      .then(result => {
        if (result.Count > 0) return Promise.reject('This phone number has been already verified');
        else return Promise.resolve(true);
      });
  }

  static _listSendersResponse(user) {
    return new Promise((resolve) => {
      const senders = user.senders || [];
      resolve({ items: senders });
    });
  }

  static deleteSender(userId, senderId) {
    return this.listSenders(userId)
      .then(senderItems => this._removeSender(senderItems.items, senderId, userId));
  }

  static _removeSender(senders, senderId, userId) {
    const filteredSenders = senders.filter(s => s.id !== senderId || (s.id === senderId && s.verified === true));
    if (filteredSenders < senders) {
      return this.update({ senders: filteredSenders }, userId).then(user => user.senders);
    } else {
      return Promise.reject('Sender cannot be deleted');
    }
  }

  static isInSandbox(userId) {
    return this.getReports(userId)
      .then(reports => {
        const sentCount = reports.reduce((acumm, report) => {
          acumm += report.sentCount || 0;
          return acumm;
        }, 0);
        return sentCount < this.sandboxThreshold;
      });
  }

  static getReports(userId) {
    return Report.allByUser(userId)
      .then(reports => reports.items || []);
  }

  static get sandboxThreshold() {
    return 50;
  }

  static updatePlan(userId, plan) {
    return this.update({ plan }, userId);
  }

  static findByEmail(email, options = {}) {
    const indexOptions = {
      indexName: this.emailIndex
    };
    const dbOptions = Object.assign({}, indexOptions, options);
    return this.allBy('email', email, dbOptions).then((users) => {
      return users.items.pop();
    });
  }

  static findByApiKey(apiKey, options = {}) {
    const indexOptions = {
      indexName: this.apiKeyIndex
    };
    const dbOptions = Object.assign({}, indexOptions, options);
    return this.allBy('apiKey', apiKey, dbOptions).then((users) => {
      return users.items.pop();
    });
  }

  static entitled(amazonCustomerId, options = {}) {
    const indexOptions = {
      indexName: this.amazonCustomerIndex
    };
    const dbOptions = Object.assign({}, indexOptions, options);
    return this.allBy('amazonCustomerId', amazonCustomerId, dbOptions);
  }
}

module.exports.User = User;
