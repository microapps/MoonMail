import * as url from 'url';
import * as fs from 'fs';
import * as Liquid from 'liquid-node';
import isEmpty from 'is-empty';
import omitEmpty from 'omit-empty';
import cuid from 'cuid';
import { SES } from 'aws-sdk';
import { Promise } from 'bluebird';
import base64url from 'base64-url';
import { Recipient, List } from 'moonmail-models';
import Senders from '../../../lib/senders/index';
import { RecipientAlreadyExists } from '../../../lib/errors';
import EventsBus from '../../../lib/events_bus';

const liquid = new Liquid.Engine();

class ListSubscribeService {
  static subscribe(list, newRecipient, userId) {
    return this._createRecipient(list, newRecipient, userId);
  }

  static _createRecipient(list, recipient, userId) {
    return this._validateUniqueRecipient(list.id, recipient.email)
      .then(() => this._doCreate(list.id, recipient, userId))
      .then(newRecipient => this._sendVerificationEmailIfApplies(list, newRecipient, userId));
  }

  static _validateUniqueRecipient(listId, email) {
    const recipientId = base64url.encode(email);
    return Recipient.get(listId, recipientId)
      .then((recipient) => {
        if ((recipient || {}).hasOwnProperty('email')) {
          return Promise.reject(new RecipientAlreadyExists(`The recipient ${email} already exists`));
        } else {
          return Promise.resolve(email);
        }
      });
  }

  static _doCreate(listId, recipient, userId) {
    const subscriptionOrigin = Recipient.subscriptionOrigins.signupForm;
    const recipientParams = Object.assign({}, { listId, subscriptionOrigin }, omitEmpty(recipient));
    recipientParams.id = base64url.encode(recipient.email);
    return List.get(userId, listId).then((list) => {
      if (list.hasOwnProperty('sendEmailVerificationOnSubscribe')) {
        if (JSON.parse(list.sendEmailVerificationOnSubscribe) === false) {
          recipientParams.status = Recipient.statuses.subscribed;
          return Recipient.save(recipientParams).then(() => recipientParams);
        }
      }
      recipientParams.verificationCode = this._generateVerificationCode();
      recipientParams.status = Recipient.statuses.awaitingConfirmation;
      return Recipient.save(recipientParams).then(() => recipientParams);
    });
  }

  static _sendVerificationEmailIfApplies(list, recipient, userId) {
    return this._getSender(userId, list)
      .then((sender) => {
        if (recipient.status === Recipient.statuses.awaitingConfirmation) {
          return this._deliverVerificationEmail(recipient, sender, userId, list);
        }
        return EventsBus.publish('list.recipient.subscribe', { recipient });
      });
  }

  static _deliverVerificationEmail(recipient, sender, userId, list) {
    return this._buildEmailBody(recipient, userId, list)
      .then((body) => {
        const sesParams = this._toSesParams(recipient.email, this._buildFrom(sender), `Please confirm your subscription to ${list.name}`, body);
        const emailClient = this._getEmailClient(sender);
        return emailClient.sendEmail(sesParams).promise();
      });
  }

  static _buildFrom(sender) {
    if (sender.fromName) return `${sender.fromName} <${sender.emailAddress}>`;
    return sender.emailAddress;
  }

  static _getEmailClient(sender) {
    const sesParams = this._sesClientParams(sender);
    return this._buildSesClient(sesParams);
  }

  static _getSender(userId, list) {
    return Senders.fetchSender(userId, list.senderId);
  }

  static _buildEmailBody(recipient, userId, list) {
    const verifyUrl = this._buildVerifyUrl(recipient, userId);
    const body = list.confirmationEmailBody ? list.confirmationEmailBody : this._defaultVerifyBody();
    const metadata = { verify_url: verifyUrl, list_name: list.name };
    return this._renderBody(body, metadata);
  }

  static _defaultVerifyBody() {
    const file = 'api/recipients/lib/templates/email_confirmation.html';
    return fs.readFileSync(file, 'utf8');
  }

  static _renderBody(body, metadata) {
    const defaults = { list_name: '' };
    const bodyMetadata = Object.assign({}, defaults, metadata);
    return liquid.parseAndRender(body, bodyMetadata);
  }

  static _buildVerifyUrl(recipient, userId) {
    const verifyPath = `lists/${recipient.listId}/recipients/${recipient.id}/verify`;
    const unsubscribeUrl = {
      protocol: 'https',
      hostname: this.apiHost,
      pathname: verifyPath,
      query: { v: recipient.verificationCode, u: base64url.encode(userId) }
    };
    return url.format(unsubscribeUrl);
  }

  static get apiHost() {
    return process.env.API_HOST;
  }

  static _generateVerificationCode() {
    return cuid();
  }

  static _buildSesClient(sesConfig) {
    return new SES(sesConfig);
  }

  static _sesClientParams(credentials) {
    return {
      accessKeyId: credentials.apiKey,
      secretAccessKey: credentials.apiSecret,
      region: credentials.region
    };
  }

  static _toSesParams(recipientEmail, fromEmail, subject, body) {
    return {
      Destination: {
        ToAddresses: [recipientEmail]
      },
      Message: {
        Body: {
          Html: { Data: body }
        },
        Subject: { Data: subject }
      },
      Source: fromEmail
    };
  }
}

module.exports.ListSubscribeService = ListSubscribeService;
