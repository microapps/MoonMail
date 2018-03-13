import { Promise } from 'bluebird';
import R from 'ramda';
import moment from 'moment';
import omitEmpty from 'omit-empty';
import { Recipient } from 'moonmail-models';
import { debug } from './index';

class EmailNotificationService {
  constructor(notification) {
    this.notification = notification;
  }

  get headers() {
    return R.pathOr({}, ['mail', 'headers'], this.notification);
  }

  get emailMetadata() {
    const payloadHeadersMapping = {
      listId: 'X-Moonmail-List-ID',
      recipientId: 'X-Moonmail-Recipient-ID',
      campaignId: 'X-Moonmail-Campaign-ID'
    };
    const headerValue = header => R.pipe(
      R.find(R.propEq('name', header)),
      el => el ? el : {},
      R.prop('value')
    )(this.headers);
    const metadata = Object.keys(payloadHeadersMapping).reduce((acc, key) => {
      const newObj = { [key]: headerValue(payloadHeadersMapping[key]) };
      return Object.assign({}, acc, newObj);
    }, {});
    return omitEmpty(metadata);
  }

  process() {
    if (!this.isProcessable()) return Promise.resolve(true);
    return this.unsubscribeRecipient();
  }

  isProcessable() {
    const requiredMetadata = ['listId', 'recipientId', 'campaignId'];
    const hasAllRequiredMetadata = R.allPass(R.map(R.has, requiredMetadata));
    return hasAllRequiredMetadata(this.emailMetadata);
  }

  unsubscribeRecipient() {
    const { listId, recipientId } = this.emailMetadata;
    if (this.shouldUnsubscribe()) {
      const recipient = { status: this.newStatus };
      recipient[`${this.newStatus}At`] = moment().unix();
      return Recipient.update(omitEmpty(recipient), listId, recipientId);
    }
    return Promise.resolve({});
  }

  get newStatus() {
    switch (this.notification.notificationType.toLowerCase()) {
      case 'bounce': {
        const bounceType = this.notification.bounce.bounceType.toLowerCase();
        if (bounceType === 'permanent' || bounceType === 'undetermined') {
          return Recipient.statuses.bounced;
        }
        return `${Recipient.statuses.bounced}::${bounceType}`;
      }
      case 'complaint':
        return Recipient.statuses.complaint;
      default:
        return null;
    }
  }

  isHardBounce() {
    if (this.notification.notificationType.toLowerCase() === 'bounce') {
      const bounceType = this.notification.bounce.bounceType.toLowerCase();
      if (bounceType === 'permanent' || bounceType === 'undetermined') {
        return true;
      }
    }
    return false;
  }

  isComplaint() {
    return this.notification.notificationType.toLowerCase() === 'complaint';
  }

  shouldUnsubscribe() {
    return this.isHardBounce() || this.isComplaint();
  }
}

module.exports.EmailNotificationService = EmailNotificationService;
