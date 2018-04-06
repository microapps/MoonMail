import './spec_helper';

import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import { Recipient } from 'moonmail-models';
import { AttachRecipientsService } from './attach_recipients_service';


describe('AttachRecipientsService', () => {
  const userId = 'some_user_id';
  const userPlan = 'free';
  const sender = { apiKey: 'api-key', apiSecret: 'secret' };
  let snsClient;
  let service;

  describe('attaching recipients', () => {
    context('when campaign the is sent to lists', () => {
      const listIds = ['some-list-id', 'another-list-id'];
      const campaign = {
        id: 'some_campaign_id',
        body: 'Hi {{ name }}, this is the body of the email',
        subject: 'Hi {{ name }} {{ surname }}',
        listIds
      };

      const campaignMessage = { userId, userPlan, campaign, sender };

      before(() => {
        awsMock.mock('SNS', 'publish', (params, cb) => {
          if (params.hasOwnProperty('Message') && params.hasOwnProperty('TopicArn')) {
            cb(null, { ReceiptHandle: 'STRING_VALUE' });
          } else {
            cb('Invalid params');
          }
        });
        snsClient = new AWS.SNS();
        service = new AttachRecipientsService(snsClient, campaignMessage);
        sinon.stub(service, '_notifyAttachListRecipients').resolves(true);
        sinon.stub(service, '_notifyToUpdateCampaignStatus').resolves(true);
        sinon.stub(service, '_notifyToSendEmails').resolves(true);
        sinon.stub(service, '_wait').resolves(true);
        sinon.stub(service, '_notifyToSendSMS').resolves(true);
      });

      it('notifies to lists recipients attachers', (done) => {
        service.execute().then(() => {
          expect(service._notifyAttachListRecipients).to.have.been.calledTwice;

          const firstCall = service._notifyAttachListRecipients.firstCall.args[0];
          expect(firstCall).to.include({ sender });
          expect(firstCall).to.include({ campaign });
          expect(firstCall).to.include({ userId });
          expect(firstCall).to.include({ userPlan });
          expect(firstCall).to.include({ listId: listIds[0] });

          const lastCall = service._notifyAttachListRecipients.lastCall.args[0];
          expect(lastCall).to.include({ sender });
          expect(lastCall).to.include({ campaign });
          expect(lastCall).to.include({ userId });
          expect(lastCall).to.include({ userPlan });
          expect(lastCall).to.include({ listId: listIds[1] });

          expect(service._notifyToUpdateCampaignStatus).to.have.been.calledOnce;
          expect(service._notifyToSendEmails).to.have.been.calledOnce;
          expect(service._wait).to.have.been.calledOnce;
          expect(service._notifyToSendSMS).to.have.been.calledOnce;
          done();
        }).catch(err => done(err));
      });
      after(() => {
        awsMock.restore('SNS');
        service._notifyAttachListRecipients.restore();
        service._notifyToUpdateCampaignStatus.restore();
        service._notifyToSendEmails.restore();
        service._wait.restore();
      });
    });

    context('when campaign the is sent to segments', () => {
      const segmentId = '123';
      const campaign = {
        id: 'some_campaign_id',
        body: 'Hi {{ name }}, this is the body of the email',
        subject: 'Hi {{ name }} {{ surname }}',
        segmentId
      };

      const campaignMessage = { userId, userPlan, campaign, sender };

      before(() => {
        awsMock.mock('SNS', 'publish', (params, cb) => {
          if (params.hasOwnProperty('Message') && params.hasOwnProperty('TopicArn')) {
            cb(null, { ReceiptHandle: 'STRING_VALUE' });
          } else {
            cb('Invalid params');
          }
        });
        snsClient = new AWS.SNS();
        service = new AttachRecipientsService(snsClient, campaignMessage);
        sinon.stub(service, '_notifyAttachSegmentMembers').resolves(true);
        sinon.stub(service, '_notifyToUpdateCampaignStatus').resolves(true);
        sinon.stub(service, '_notifyToSendEmails').resolves(true);
        sinon.stub(service, '_wait').resolves(true);
        sinon.stub(service, '_notifyToSendSMS').resolves(true);
      });

      it('notifies to segment recipients attachers', (done) => {
        service.execute().then(() => {
          expect(service._notifyAttachListRecipients).to.have.been.once;
          const args = service._notifyAttachSegmentMembers.lastCall.args[0];

          expect(args).to.include({ sender });
          expect(args).to.include({ campaign });
          expect(args).to.include({ userId });
          expect(args).to.include({ userPlan });
          expect(args.campaign).to.include({ segmentId });

          expect(service._notifyToUpdateCampaignStatus).to.have.been.calledOnce;
          expect(service._notifyToSendEmails).to.have.been.calledOnce;
          expect(service._wait).to.have.been.calledOnce;
          expect(service._notifyToSendSMS).to.have.been.calledOnce;
          done();
        }).catch(err => done(err));
      });
      after(() => {
        awsMock.restore('SNS');
        service._notifyAttachSegmentMembers.restore();
        service._notifyToUpdateCampaignStatus.restore();
        service._notifyToSendEmails.restore();
        service._wait.restore();
        service._notifyToSendSMS.restore();
      });
    });
  });
});
