import { Model, Campaign, Report } from 'moonmail-models';
import { NonExistingSender, SenderAlreadyExists } from '../errors';
import { debug } from '../index';
import cuid from 'cuid';
import omitEmpty from 'omit-empty';

class User extends Model {

  static get tableName() {
    return process.env.USERS_TABLE;
  }

  static get hashKey() {
    return 'id';
  }

  static listSenders(userId) {
    debug('= User.listSender', userId);
    return this.get(userId)
      .then(user => this._listSendersResponse(user));
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
        reject(new NonExistingSender('The sender doesn\'t exist'));
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
    return Campaign.allBy('userId', userId, { recursive: true })
      .then(campaigns => this._getReports(campaigns.items));
  }

  static _getReports(campaigns) {
    return Promise.map(campaigns, campaign => Report.get(campaign.id), { concurrency: 2 });
  }

  static get sandboxThreshold() {
    return 50;
  }

  static updatePlan(userId, plan) {
    return this.update({plan}, userId);
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
}

module.exports.User = User;
