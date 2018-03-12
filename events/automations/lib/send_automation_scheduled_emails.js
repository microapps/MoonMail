import Promise from 'bluebird';
import { Automation } from 'moonmail-models';
import omitEmpty from 'omit-empty';
import DeliverScheduledEmail from './deliver_scheduled_email';

export default class SendAutomationScheduledEmails {
  static execute(scheduledEmails = []) {
    return this._getAutomation(scheduledEmails)
      .then(automation => this._checkAutomationActive(automation))
      .then(() => this._sendEmails(scheduledEmails))
      .then(emailDeliveries => this._buildResult(emailDeliveries))
      .catch(err => this._handleErrors(err, scheduledEmails));
  }

  static _getAutomation(scheduledEmails) {
    const automationId = scheduledEmails[0].automationId;
    const userId = scheduledEmails[0].userId;
    return Automation.get(userId, automationId);
  }

  static _checkAutomationActive(automation) {
    return automation.status === 'active'
      ? Promise.resolve(automation)
      : Promise.reject(new Error('Paused automation'));
  }

  static _sendEmails(scheduledEmails = []) {
    return Promise.map(scheduledEmails, email => this._sendEmail(email),
      { concurrency: 5 });
  }

  static _sendEmail(scheduledEmail) {
    return DeliverScheduledEmail.execute(scheduledEmail)
      .then(result => Object.assign({}, result, { scheduledEmail }));
  }

  static _buildResult(emailDeliveries = []) {
    return emailDeliveries.map((delivery) => {
      const result = { email: delivery.scheduledEmail };
      const { error, retryable } = delivery;
      return Object.assign({}, result, omitEmpty({ error, retryable }));
    });
  }

  static _handleErrors(error, scheduledEmails) {
    return (error.message === 'Paused automation')
      ? scheduledEmails.map(email => ({ email, error, retryable: false }))
      : [];
  }
}
