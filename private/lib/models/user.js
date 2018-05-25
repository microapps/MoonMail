import { Model, Report } from 'moonmail-models';
import cuid from 'cuid';
import omitEmpty from 'omit-empty';
import { NonExistingSender, SenderAlreadyExists } from '../errors';
import { debug } from '../index';

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
    debug('= User.listSender', userId);
    return this.get(userId)
      .then(user => this._listSendersResponse(user));
  }

  static checkPhoneUnique(phoneNumber) {
    debug('= User._phoneExists', phoneNumber);
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

  static fetchSender(userId, senderId, includeNonVerified = false, includeAwsCreds = true) {
    debug('= User.fetchSender', userId, senderId);
    return this.get(userId)
      .then(user => this._findSender(user, senderId, includeNonVerified, includeAwsCreds));
  }

  static _findSender(user, senderId, includeNonVerified, includeAwsCreds) {
    return new Promise((resolve, reject) => {
      debug('= User._findSender', JSON.stringify(user), senderId);
      const sender = user.senders.find(sender => sender.id === senderId);
      if (sender && (sender.verified || includeNonVerified)) {
        const userSender = Object.assign({}, sender);
        if (includeAwsCreds) {
          Object.assign(userSender, user.ses);
        }
        resolve(userSender);
      } else {
        reject(new NonExistingSender(`The sender ${senderId} doesn\'t exist`));
      }
    });
  }

  static createSender(userId, emailAddress, fromName) {
    debug('= User.createSender', userId, emailAddress);
    return this.listSenders(userId)
      .then(senderItems => this._addSender(senderItems.items, emailAddress, fromName, userId));
  }

  static updateSender(userId, sender) {
    debug('= User.updateSender', userId, JSON.stringify(sender));
    return this.listSenders(userId)
      .then(senderItems => this._modifySender(senderItems.items, sender, userId));
  }

  static deleteSender(userId, senderId) {
    debug('= User.deleteSender', userId, senderId);
    return this.listSenders(userId)
      .then(senderItems => this._removeSender(senderItems.items, senderId, userId));
  }

  static _removeSender(senders, senderId, userId) {
    debug('= User._removeSender', JSON.stringify(senders), senderId, userId);
    const filteredSenders = senders.filter(s => s.id !== senderId || (s.id === senderId && s.verified === true));
    if (filteredSenders < senders) {
      return this.update({ senders: filteredSenders }, userId).then(user => user.senders);
    } else {
      return Promise.reject('Sender cannot be deleted');
    }
  }

  static isInSandbox(userId) {
    debug('= User.isInSandbox', userId);
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

  static _modifySender(senders, sender, userId) {
    return new Promise((resolve, reject) => {
      debug('= User._modifySender', JSON.stringify(senders), JSON.stringify(sender));
      const oldSenderIndex = senders.findIndex(s => s.id === sender.id);
      if (oldSenderIndex < 0) {
        debug('= User._modifySender', 'Sender does not exist');
        reject(new NonExistingSender('Sender does not exist'));
      } else {
        debug('= User._modifySender', 'Sender exists');
        const newSender = omitEmpty(Object.assign({}, senders[oldSenderIndex], sender));
        const newSenders = senders.slice(0);
        newSenders[oldSenderIndex] = newSender;
        this.update({ senders: newSenders }, userId)
          .then(() => {
            debug('= User._modifySender', 'Success', JSON.stringify(newSender));
            resolve(newSender);
          })
          .catch(reject);
      }
    });
  }

  static _addSender(senders, emailAddress, fromName, userId) {
    return new Promise((resolve, reject) => {
      const sender = senders.find(s => s.emailAddress === emailAddress);
      if (sender) {
        debug('= User._addSender', `Sender ${emailAddress} already exists`);
        reject(new SenderAlreadyExists(`Sender ${emailAddress} already exists`));
      } else {
        const newSender = omitEmpty({
          id: cuid(),
          emailAddress,
          fromName,
          verified: false
        });
        const newSenders = senders.concat(newSender);
        this.update({ senders: newSenders }, userId)
          .then(() => {
            debug('= User.createSender', 'Success', JSON.stringify(newSender));
            resolve(newSender);
          })
          .catch(reject);
      }
    });
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
