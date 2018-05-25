import { Recipient } from 'moonmail-models';

export class ConfirmSubscriptionService {

  static create(listId, recipientId, verificationCode) {
    return new ConfirmSubscriptionService(listId, recipientId, verificationCode);
  }

  constructor(listId, recipientId, verificationCode) {
    this.listId = listId;
    this.recipientId = recipientId;
    this.verificationCode = verificationCode;
  }

  subscribe() {
    return Recipient.get(this.listId, this.recipientId)
      .then(recipient => this._validateCode(recipient))
      .then(() => this._updateRecipientStatus());
  }

  _validateCode(recipient) {
    if (recipient.verificationCode && recipient.verificationCode === this.verificationCode) {
      return Promise.resolve(recipient);
    } else {
      return Promise.reject(new Error('Wrong verification code'));
    }
  }

  _updateRecipientStatus() {
    const params = {status: Recipient.statuses.subscribed};
    return Recipient.update(params, this.listId, this.recipientId);
  }
}
