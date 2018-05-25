import Promise from 'bluebird';
import request from 'request-promise';
import moment from 'moment';
import base64url from 'base64-url';
import { Recipient, List } from 'moonmail-models';
import { logger } from '../../../lib/index';
import UserNotifier from '../../../lib/user_notifier';

const shuffleArray = arr => arr.sort(() => Math.random() - 0.5);

function splitInChunks(array, chunkSize) {
  return Array(Math.ceil(array.length / chunkSize)).fill().map((_, i) => array.slice(i * chunkSize, i * chunkSize + chunkSize));
}

class CleanRecipientsEmailService {
  static async cleanUpdateAndNotify(recipients) {
    return await new CleanRecipientsEmailService(recipients).cleanUpdateAndNotify();
  }

  static async cleanAndUpdate(recipients) {
    return await new CleanRecipientsEmailService(recipients).cleanAndUpdate();
  }

  constructor(recipients) {
    this.recipients = recipients;
    this.endpoints = shuffleArray(['smtp-out1.moonmail.io/verify', 'smtp-out2.moonmail.io/verify', 'smtp-out3.moonmail.io/verify', 'smtp-out4.moonmail.io/verify']);
  }

  clean() {
    if (this.recipients.length === 0) return Promise.resolve();
    const total = this.recipients.length;
    const totalChunks = this.endpoints.length;
    const chunkSize = Math.ceil(total / totalChunks);
    const chunks = splitInChunks(this.recipients, chunkSize);
    return Promise.map(chunks, (chunk, index, length) => this._processChunk(chunk, index), { concurrency: totalChunks })
      .then(recipientsArraysWithRiskScore => [].concat.apply([], recipientsArraysWithRiskScore));
  }

  cleanAndUpdate() {
    if (this.recipients.length === 0) return Promise.resolve();
    return this.clean()
      .then(recipients => Promise.map(recipients, recipient => Recipient.update({ riskScore: recipient.riskScore }, recipient.listId, recipient.id), { concurrency: 4 }))
      .then(updatedRecipients => this._groupByListId(updatedRecipients))
      .then(recipientsByListId => Promise.map(Object.keys(recipientsByListId), listId => this._updateListStats(listId, recipientsByListId[listId]), { concurrency: 4 }));
  }

  cleanUpdateAndNotify() {
    if (this.recipients.length === 0) return Promise.resolve();
    return this.cleanAndUpdate()
      .then(results => Promise.map(results, result => this._notifyStatus(result.listId, result.userId), { concurrency: 2 }));
  }

  _processChunk(chunk, index) {
    const endpoint = this._getURL(index);
    const validRecipients = chunk.filter(recipient => !!recipient.listId && !!recipient.id && !!recipient.email);
    logger().info(`Processing chunk with endpoint ${endpoint} with size ${validRecipients.length}`);
    const emails = validRecipients.map(recipient => recipient.email);
    return this._doClean(endpoint, emails)
      .then(cleanResuts => validRecipients.map((recipient) => {
        const result = cleanResuts.find(res => ((res || {}).recipient || '').trim() === (recipient.email || '').trim());
        if (result) return Object.assign({}, recipient, { riskScore: this._riskScoreFromStatus(result.status) });
        return null;
      })).then(results => results.filter(r => !!r));
  }

  // cleanAndNotify() {
  //   const listsWithEmails = this._emailsByList();

  //   return Promise.map(Object.keys(listsWithEmails), listId => this._doCleanAndUpdate(listId, listsWithEmails[listId])
  //     .then(updatedRecipients => this._updateListStats(listId, updatedRecipients))
  //     .then(result => this._notifyStatus(result.listId, result.userId)), { concurrency: 2 });
  // }

  // clean() {
  //   const listsWithEmails = this._emailsByList();
  //   return Promise.map(Object.keys(listsWithEmails), listId => this._doCleanAndUpdate(listId, listsWithEmails[listId]), { concurrency: 2 });
  // }

  _groupByListId(recipients) {
    return recipients.reduce((resultList, currentRecipient) => {
      if (!resultList[currentRecipient.listId]) {
        resultList[currentRecipient.listId] = [];
      }
      if (currentRecipient.email) {
        resultList[currentRecipient.listId].push(currentRecipient);
      }
      return resultList;
    }, {});
  }

  _doClean(endpoint, emails) {
    const uriWithAuth = `https://${process.env.EMAIL_CLEANING_SERVICE_USERNAME}:${process.env.EMAIL_CLEANING_SERVICE_PASSWORD}@${endpoint}`;
    const params = {
      method: 'POST',
      uri: uriWithAuth,
      json: true,
      headers: {
        'Content-Type': 'application/json'
      },
      form: {
        address: emails.join('\n')
      }
    };
    return request(params);
  }

  _riskScoreFromStatus(status) {
    if (status === 'valid') return 0;
    if (status === 'pending' || status === 'unknown') return -1;
    if (status === 'failed') return 1;
    // should not happen
    return -100;
  }

  _getURL(index) {
    const urls = this.endpoints;
    return urls[index % urls.length];
  }

  _updateListStats(listId, updatedRecipients) {
    if (updatedRecipients.length > 0) {
      if (updatedRecipients[0].userId) {
        const userId = updatedRecipients[0].userId;
        logger().info(`Updating list ${listId} with ${updatedRecipients.length} post-processed recipients`);
        return List.incrementAll(userId, listId, { totalPostProcessed: updatedRecipients.length })
          .then(() => ({ listId, userId }));
      }
    }
    return Promise.resolve({});
  }

  _notifyStatus(listId, userId) {
    //
    // totalPostProcessed could be higher than total recpts because
    // we are retrying the cleaning process for pending addresses.
    // Given that case is enough if we unlock the list
    // if totalProstProcessed reaches the total number of
    // recipients, otherwise, we could lock the list forever.
    // We are trusting here on the efficiency of the email
    // cleaner service.
    //
    if (!listId || !userId) return Promise.resolve();
    return List.get(userId, listId).then((list) => {
      if (list.processed === true) return Promise.resolve();

      const createdDates = Object.keys(list.importStatus).reduce((acc, current) => {
        acc.push(list.importStatus[current].createdAt);
        return acc;
      }, []);
      const [lastImport] = createdDates.sort().slice(-1);
      const fifteenMinutesDelay = moment.unix(lastImport).add(15, 'minutes');
      if (moment().isSameOrAfter(fifteenMinutesDelay)) {
        return List.update({ processed: true }, userId, listId)
          .then(() => UserNotifier.notify(userId, { type: 'LIST_UPDATED', data: { id: listId, processed: true } }));
      }

      if (list.total > list.totalPostProcessed) {
        return List.update({ processed: false }, userId, listId)
          .then(() => UserNotifier.notify(userId, { type: 'LIST_UPDATED', data: { id: listId, processed: false } }));
      }

      return List.update({ processed: true }, userId, listId)
        .then(() => UserNotifier.notify(userId, { type: 'LIST_UPDATED', data: { id: listId, processed: true } }));
    });
  }
}

module.exports.CleanRecipientsEmailService = CleanRecipientsEmailService;
