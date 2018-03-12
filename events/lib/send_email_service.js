import UIDGenerator from 'uid-generator';
import { Promise } from 'bluebird';
import * as async from 'async';
import { SES } from 'aws-sdk';
import { logger } from './index';

class SendEmailService {

  constructor(queue, lambdaClient, context, state = {}) {
    this.queue = queue;
    this.emailClient = null;
    this.lambdaClient = lambdaClient;
    this.lambdaName = context.functionName;
    this.context = context;
    this.counter = state.sentEmails || 0;
    this.lastReputationCheckedOn = state.lastReputationCheckedOn || 0;
    this.reputation = state.reputation || 15;
    this.userId = null;
    this.userPlan = null;
  }

  get executionThreshold() {
    return 60000;
  }

  sendEnqueuedEmails() {
    return this._checkReputation()
      .then(() => this.sendBatch())
      .then(batch => this.deleteBatch(batch))
      .then(() => this.sendNextBatch())
      .catch(() => logger().info('SendEmailService.sendEnqueuedEmails', `Sent ${this.counter} emails so far`));
  }

  sendNextBatch() {
    if (this.timeEnough()) {
      logger().debug('SendEmailService.sendNextBatch', 'Time enough for another batch');
      return this.sendEnqueuedEmails();
    }
    logger().info('SendEmailService.sendNextBatch', 'Not time enough for next batch, invoking lambda...');
    return this._checkReputation().then(() => this.invokeLambda());
  }

  invokeLambda() {
    logger().debug('SendEmailService.invokeLambda', 'Invoking function again', this.lambdaName);
    const payload = { QueueUrl: this.queue.url, state: { sentEmails: this.counter, lastReputationCheckedOn: this.lastReputationCheckedOn, reputation: this.reputation } };
    const params = {
      FunctionName: this.lambdaName,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
    };
    return this._invokeLambda(params);
  }

  timeEnough() {
    return (this.context.getRemainingTimeInMillis() > this.executionThreshold);
  }

  sendBatch() {
    logger().info('SendEmailService.sendBatch', 'Sending batch...');
    return new Promise((resolve, reject) => {
      const sentEmailsHandles = [];
      const sentEmails = [];
      this.queue.retrieveMessages()
        .then((enqueuedEmails) => {
          logger().debug('SendEmailService.sendBatch', 'Got', enqueuedEmails.length, 'messages');
          this.setEmailClient(enqueuedEmails[0]);
          this.updateUserData(enqueuedEmails[0]);
          async.each(enqueuedEmails, (email, callback) => {
            this.deliver(email)
              .then((result) => {
                sentEmailsHandles.push({
                  ReceiptHandle: email.receiptHandle,
                  Id: email.messageId
                });
                const sentEmail = email.toSentEmail(result.MessageId);
                logger().debug('SendEmailService.sendBatch', 'Email data', JSON.stringify(sentEmail));
                sentEmails.push(sentEmail);
                callback();
              })
              .catch((err) => {
                logger().warn('SendEmailService.sendBatch', 'Error', err);
                if (this._isAbortError(err)) {
                  logger().error('SendEmailService.sendBatch', 'Aborting...');
                  reject(err);
                } else if (this._isRetryableError(err)) {
                  logger().warn('SendEmailService.sendBatch', 'Retry');
                  callback();
                } else {
                  logger().debug('SendEmailService.sendBatch', 'Removing from queue', err);
                  sentEmailsHandles.push({
                    ReceiptHandle: email.receiptHandle,
                    Id: email.messageId
                  });
                  callback();
                }
              });
          }, () => {
            resolve(sentEmailsHandles);
          });
        })
        .catch(() => logger().debug('SendEmailService.sendBatch', `Sent ${this.counter} emails so far`));
    });
  }

  _invokeLambda(params) {
    return new Promise((resolve, reject) => {
      this.lambdaClient.invoke(params, (err, data) => {
        if (err) {
          logger().error('SendEmailService._invokeLambda', 'Error invoking lambda', err, err.stack);
          reject(err);
        } else {
          logger().debug('SendEmailService._invokeLambda', 'Invoked successfully', params);
          resolve(data);
        }
      });
    });
  }

  _isAbortError(error) {
    logger().error('SendEmailService._isAbortError', error);
    return error.code && error.code === 'MessageRejected' ||
      (error.code === 'Throttling' && !!error.message.toLowerCase().match('daily message quota exceeded'));
  }

  _isRetryableError(error) {
    logger().warn('SendEmailService._isRetryableError', error);
    return error.code && error.code === 'Throttling' && !!error.message.toLowerCase().match('maximum sending rate exceeded');
  }

  deleteBatch(batch) {
    logger().debug('SendEmailService.deleteBatch', `Deleting a batch of ${batch.length} messages`);
    return this.queue.removeMessages(batch);
  }

  deliver(enqueuedEmail) {
    logger().debug('SendEmailService.deliver', 'Sending email', enqueuedEmail.receiptHandle, JSON.stringify(enqueuedEmail));
    if (!this._shouldSendEmail(enqueuedEmail.message.recipient)) {
      logger().info('SendEmailService.deliver detected recipient with elevated risk score, skipping the smtp relay delivery', JSON.stringify(enqueuedEmail.message.recipient));
      const uidGenerator = new UIDGenerator(256, UIDGenerator.BASE62);
      return Promise.resolve({ MessageId: `${enqueuedEmail.message.campaign.id}-${uidGenerator.generateSync()}`, status: 'BounceDetected' });
    }
    return enqueuedEmail.toSesRawParams()
      .then(params => this._deliverRawEmail(params));
  }

  _deliverRawEmail(params) {
    return new Promise((resolve, reject) => {
      this.emailClient.sendRawEmail(params, (err, data) => {
        if (err) {
          logger().debug('SendEmailService.deliver', 'Error sending email', err, err.stack);
          reject(err);
        } else {
          logger().debug('SendEmailService.deliver', 'Email sent');
          this.counter++;
          resolve(data);
        }
      });
    });
  }

  _shouldSendEmail(recipient) {
    if (recipient.riskScore) {
      // riskScore = -1 is considered as unknown
      // so is better idea to send the email
      if (recipient.riskScore <= 0) {
        return true;
      }
      // riskScore > 0 considered harmful
      return false;
    }
    // for some reason there isn't any riskScore information
    // proceed to send
    return true;
  }

  setEmailClient(enqueuedEmail) {
    logger().debug('SendEmailService.setEmailClient', 'Getting client');
    if (!this.emailClient) {
      logger().debug('SendEmailService.setEmailClient', 'Non existing client. Building one...');
      this.emailClient = new SES(this._sesClientParams(enqueuedEmail));
      return this.emailClient;
    }
  }

  _sesClientParams(enqueuedEmail) {
    logger().debug('SendEmailService._sesClientParams', JSON.stringify(enqueuedEmail.message.sender));
    return {
      accessKeyId: enqueuedEmail.message.sender.apiKey,
      secretAccessKey: enqueuedEmail.message.sender.apiSecret,
      region: enqueuedEmail.message.sender.region
    };
  }

  updateUserData(enqueuedEmail) {
    this.userId = enqueuedEmail.getEmailUserId();
    this.userPlan = enqueuedEmail.getEmailUserPlan();
  }

  _invokeGetUserData() {
    logger().debug('SendEmailService._invokeGetUserData');
    const payload = { userId: this.userId };
    const params = {
      FunctionName: process.env.GET_USER_DATA_FUNCTION_NAME,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload)
    };
    return this._invokeLambda(params);
  }

  _checkReputation() {
    const reputationCheckInterval = (this.userPlan || 'free') === 'free' ? 50 : 1000;
    if (this.counter - this.lastReputationCheckedOn >= reputationCheckInterval) {
      this.lastReputationCheckedOn = this.counter;
      logger().debug('SendEmailService._checkReputation, working...');
      return this._invokeGetUserData().then((response) => {
        const userData = JSON.parse(response.Payload);
        const reputationData = userData.reputationData;
        this.reputation = reputationData.reputation;
        logger().debug('SendEmailService._checkReputation user reputation:', reputationData);
        if (reputationData.reputation < reputationData.minimumAllowedReputation) {
          logger().error('SendEmailService._checkReputation, Bad Reputation detected', reputationData.reputation, 'stopping...');
          return Promise.reject('Bad reputation');
        }
        return Promise.resolve({});
      }).catch((error) => {
        logger().warn('SendEmailService._checkReputation error occurred:', error);
        if (error === 'Bad reputation') {
          // return this.queue.purgeQueue().then(() => Promise.reject(error));
          return Promise.reject(error);
        }
        // Being conservative since this should not break send emails proccess
        return Promise.resolve({});
      });
    }

    return Promise.resolve({});
  }
}

module.exports.SendEmailService = SendEmailService;
