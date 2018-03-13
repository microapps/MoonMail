import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import R from 'ramda';
import { Recipient } from 'moonmail-models';
import { EmailNotificationService } from './email_notification_service';
import * as softBounce from './fixtures/soft_bounce_notification.json';
import * as bounce from './fixtures/bounce_notification.json';
import * as complaint from './fixtures/complaint_notification.json';

const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('EmailNotificationService', () => {
  let updateRecipientStub;
  const recipientId = 'thatUserId';
  const listId = 'some-list-id';
  const campaignId = 'the-campaign-id';
  const headers = [
    {
      name: 'X-Moonmail-Campaign-ID',
      value: campaignId
    },
    {
      name: 'X-Moonmail-List-ID',
      value: listId
    },
    {
      name: 'X-Moonmail-Recipient-ID',
      value: recipientId
    }
  ];
  const withHeaders = notification => R.assocPath(['mail', 'headers'], headers, notification);
  const emailMetadata = { recipientId, listId, campaignId };

  beforeEach(() => {
    updateRecipientStub = sinon.stub(Recipient, 'update').resolves(true);
  });

  afterEach(() => {
    updateRecipientStub.restore();
  });

  describe('#getEmailMetadata()', () => {
    it('returns the sent email', () => {
      const emailNotificationService = new EmailNotificationService(withHeaders(bounce));
      const metadata = emailNotificationService.emailMetadata;
      expect(metadata).to.deep.equal(emailMetadata);
    });
  });

  describe('#unsubscribeRecipient()', () => {
    context('when the notification is a bounce', () => {
      it('unsubscribes the recipient with bouncedAt timestamp', (done) => {
        const emailNotificationService = new EmailNotificationService(withHeaders(bounce));
        emailNotificationService.unsubscribeRecipient().then(() => {
          const args = Recipient.update.lastCall.args;
          const updateParams = args[0];
          const listIdParam = args[1];
          const recipientIdParam = args[2];
          expect(updateParams).to.have.property('bouncedAt');
          expect(updateParams).to.have.property('status', Recipient.statuses.bounced);
          expect(listIdParam).to.equal(listId);
          expect(recipientIdParam).to.equal(recipientId);
          done();
        });
      });
    });

    context('when the notification is a bounce', () => {
      it('does not unsubscribe the recipient', (done) => {
        const emailNotificationService = new EmailNotificationService(withHeaders(softBounce));
        emailNotificationService.unsubscribeRecipient().then(() => {
          expect(Recipient.update).to.not.have.been.called;
          done();
        });
      });
    });

    context('when the notification is a complaint', () => {
      it('unsubscribes the recipient with complainedAt timestamp', (done) => {
        const emailNotificationService = new EmailNotificationService(withHeaders(complaint));
        emailNotificationService.unsubscribeRecipient().then(() => {
          const args = Recipient.update.lastCall.args;
          const updateParams = args[0];
          const listIdParam = args[1];
          const recipientIdParam = args[2];
          expect(updateParams).to.have.property('complainedAt');
          expect(updateParams).to.have.property('status', Recipient.statuses.complaint);
          expect(listIdParam).to.equal(listId);
          expect(recipientIdParam).to.equal(recipientId);
          done();
        });
      });
    });
  });

  describe('#process', () => {
    context('when the notification has all the needed headers', () => {
      const emailNotificationService = new EmailNotificationService(withHeaders(bounce));

      before(() => {
        sinon.stub(emailNotificationService, 'unsubscribeRecipient').resolves(true);
      });
      after(() => {
        emailNotificationService.unsubscribeRecipient.restore();
      });

      it('should unsubscribes the recipient', (done) => {
        emailNotificationService.process().then(() => {
          expect(emailNotificationService.unsubscribeRecipient).to.have.been.calledOnce;
          done();
        });
      });
    });

    context('when the notification does not have all the needed headers', () => {
      const emailNotificationService = new EmailNotificationService(bounce);

      before(() => {
        sinon.spy(emailNotificationService, 'unsubscribeRecipient');
      });
      after(() => {
        emailNotificationService.unsubscribeRecipient.restore();
      });

      it('should skip it', (done) => {
        emailNotificationService.process().then(() => {
          expect(emailNotificationService.unsubscribeRecipient).to.not.have.been.called;
          done();
        });
      });
    });
  });
});
