import { debug } from './index';
import { Recipient } from 'moonmail-models';
import * as async from 'async';
import Promise from 'bluebird';

class AttachListRecipientsService {
  constructor(snsClient, attachRecipientsListMessage, lambdaClient, context) {
    this.snsClient = snsClient;
    this.attachRecipientsListMessage = attachRecipientsListMessage;
    this.listId = attachRecipientsListMessage.listId;
    this.lambdaClient = lambdaClient;
    this.lambdaName = context.functionName;
    this.context = context;
  }

  get executionThreshold() {
    return 60000;
  }

  get batchSize() {
    return 250;
  }

  attachRecipients(nextPage = {}) {
    debug('= AttachListRecipientsService.attachRecipients', this.listId, nextPage);
    return this._attachRecipientsBatch(this.listId, nextPage)
      .then(nextPage => this._attachNextBatch(this.listId, nextPage));
  }

  _attachRecipientsBatch(listId, options = {}) {
    debug('= AttachListRecipientsService._attachRecipientsBatch', listId, JSON.stringify(options));
    return new Promise((resolve, reject) => {
      const next = {};
      this._getRecipientsBatch(listId, options)
        .then((result) => {
          if (result.nextPage) {
            next.page = result.nextPage;
          }
          return this._publishRecipients(result.items);
        })
        .then(() => resolve(next));
    });
  }

  _attachNextBatch(listId, next) {
    return new Promise((resolve, reject) => {
      if (next && next.hasOwnProperty('page')) {
        if (this._timeEnough()) {
          debug('= AttachListRecipientsService._attachNextBatch', 'Attaching next batch', JSON.stringify(next));
          resolve(this.attachRecipients(next));
        } else {
          debug('= AttachListRecipientsService._attachNextBatch', 'Not time enough for next batch, invoking lambda...');
          return resolve(this._invokeLambda(next));
        }
      } else {
        debug('= AttachListRecipientsService._attachNextBatch', 'No more batches');
        resolve(true);
      }
    });
  }

  _getRecipientsBatch(listId, options = {}) {
    debug('= AttachListRecipientsService.attachRecipients', `Getting recipients for ${listId}`);
    const subscribedCondition = { filters: { status: { eq: Recipient.statuses.subscribed } } };
    const recipientOptions = Object.assign(options, subscribedCondition);
    recipientOptions.limit = this.batchSize;
    return Recipient.allBy('listId', listId, recipientOptions);
  }

  _publishRecipients(recipients) {
    debug('= AttachListRecipientsService._publishRecipients', 'Publishing a batch of recipients');
    return new Promise((resolve) => {
      async.each(recipients, (recipient, cb) => {
        this._publishRecipient(recipient)
          .then(() => cb())
          .catch((err) => {
            debug('= AttachListRecipientsService._publishRecipients',
              'Couldn\'t publish recipient', JSON.stringify(recipient), err);
            cb();
          });
      }, () => resolve(true));
    });
  }

  _publishRecipient(recipient) {
    return new Promise((resolve, reject) => {
      const recipientMessage = this._buildRecipientMessage(recipient);
      debug('= AttachListRecipientsService._publishRecipient', JSON.stringify(recipientMessage));
      const params = {
        TopicArn: process.env.PRECOMPILE_EMAIL_TOPIC_ARN,
        Message: JSON.stringify(recipientMessage)
      };
      this.snsClient.publish(params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  _invokeLambda(nextPage) {
    return new Promise((resolve, reject) => {
      debug('= AttachListRecipientsService._invokeLambda', 'Invoking function again', this.lambdaName);
      const payload = {
        Records: [{
          Sns: {
            Message: {
              sender: this.attachRecipientsListMessage.sender,
              campaign: this.attachRecipientsListMessage.campaign,
              userId: this.attachRecipientsListMessage.userId,
              userPlan: this.attachRecipientsListMessage.userPlan,
              list: this.attachRecipientsListMessage.list,
              listId: this.listId
            }
          }
        }],
        batchOffset: nextPage
      };
      debug('= AttachListRecipientsService._invokeLambda', 'Payload', JSON.stringify(payload));
      const params = {
        FunctionName: this.lambdaName,
        InvocationType: 'Event',
        Payload: JSON.stringify(payload)
      };

      this.lambdaClient.invoke(params, (err, data) => {
        if (err) {
          debug('= AttachListRecipientsService._invokeLambda', 'Error invoking lambda', err, err.stack);
          reject(err);
        } else {
          debug('= AttachListRecipientsService._invokeLambda', 'Invoked successfully');
          resolve(data);
        }
      });
    });
  }

  _timeEnough() {
    return (this.context.getRemainingTimeInMillis() > this.executionThreshold);
  }

  _buildRecipientMessage(recipient) {
    debug('= AttachListRecipientsService._buildRecipientMessage', JSON.stringify(recipient));
    return Object.assign({}, this.attachRecipientsListMessage, { recipient }, { list: this.attachRecipientsListMessage.list });
  }
}

module.exports.AttachListRecipientsService = AttachListRecipientsService;
