import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import R from 'ramda';
import { Report, Recipient } from 'moonmail-models';
import { EmailNotificationService } from './email_notification_service';
import * as softBounce from './fixtures/soft_bounce_notification.json';
import * as bounce from './fixtures/bounce_notification.json';
import * as complaint from './fixtures/complaint_notification.json';
import * as delivery from './fixtures/delivery_notification.json';

const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('EmailNotificationService', () => {
  let updateRecipientStub;
  let incrementBouncesStub;
  let incrementComplaintsStub;
  let incrementDeliveriesStub;
  let incrementSoftBouncesStub;
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
    incrementBouncesStub = sinon.stub(Report, 'incrementBounces').resolves(true);
    incrementSoftBouncesStub = sinon.stub(Report, 'incrementSoftBounces').resolves(true);
    incrementComplaintsStub = sinon.stub(Report, 'incrementComplaints').resolves(true);
    incrementDeliveriesStub = sinon.stub(Report, 'incrementDeliveries').resolves(true);
  });

  afterEach(() => {
    updateRecipientStub.restore();
    incrementBouncesStub.restore();
    incrementComplaintsStub.restore();
    incrementDeliveriesStub.restore();
    incrementSoftBouncesStub.restore();
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

  describe('#incrementReportCount()', () => {
    context('when the notification is a bounce', () => {
      it('increments the bounces count', (done) => {
        const emailNotificationService = new EmailNotificationService(withHeaders(bounce));
        emailNotificationService.incrementReportCount().then(() => {
          expect(incrementBouncesStub).to.have.been.calledWith(emailMetadata.campaignId);
          done();
        });
      });
    });

    context('when the notification is a complaint', () => {
      it('increments the complaints count', (done) => {
        const emailNotificationService = new EmailNotificationService(withHeaders(complaint));
        emailNotificationService.incrementReportCount().then(() => {
          expect(incrementComplaintsStub).to.have.been.calledWith(emailMetadata.campaignId);
          done();
        });
      });
    });

    context('when the notification is a delivery', () => {
      it('increments the deliveries count', (done) => {
        const emailNotificationService = new EmailNotificationService(withHeaders(delivery));
        emailNotificationService.incrementReportCount().then(() => {
          expect(incrementDeliveriesStub).to.have.been.calledWith(emailMetadata.campaignId);
          done();
        });
      });
    });

    context('when the notification is a soft bounce', () => {
      it('increments the soft bounces count', (done) => {
        const emailNotificationService = new EmailNotificationService(withHeaders(softBounce));
        emailNotificationService.incrementReportCount().then(() => {
          expect(incrementSoftBouncesStub).to.have.been.calledWith(emailMetadata.campaignId);
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
        sinon.stub(emailNotificationService, 'incrementReportCount').resolves(true);
      });
      after(() => {
        emailNotificationService.unsubscribeRecipient.restore();
        emailNotificationService.incrementReportCount.restore();
      });

      it('should process it', (done) => {
        emailNotificationService.process().then(() => {
          expect(emailNotificationService.unsubscribeRecipient).to.have.been.calledOnce;
          expect(emailNotificationService.incrementReportCount).to.have.been.calledOnce;
          done();
        });
      });
    });

    context('when the notification does not have all the needed headers', () => {
      const emailNotificationService = new EmailNotificationService(bounce);

      before(() => {
        sinon.spy(emailNotificationService, 'unsubscribeRecipient');
        sinon.spy(emailNotificationService, 'incrementReportCount');
      });
      after(() => {
        emailNotificationService.unsubscribeRecipient.restore();
        emailNotificationService.incrementReportCount.restore();
      });

      it('should skip it', (done) => {
        emailNotificationService.process().then(() => {
          expect(emailNotificationService.unsubscribeRecipient).to.not.have.been.called;
          expect(emailNotificationService.incrementReportCount).to.not.have.been.called;
          done();
        });
      });
    });
  });
});
