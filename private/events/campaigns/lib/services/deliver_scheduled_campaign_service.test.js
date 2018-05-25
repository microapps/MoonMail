import chai from 'chai';
import sinon from 'sinon';
import sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import { Campaign } from 'moonmail-models';
import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import chaiAsPromised from 'chai-as-promised';
import { DeliverScheduledCampaignService } from './deliver_scheduled_campaign_service';
import { compressString } from '../../../../lib/utils';
import FunctionsClient from '../../../../lib/functions_client';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('DeliverScheduledCampaignService', () => {
  let snsClient = 'hahaha';
  let deliverCampaignService;
  const userId = 'some-user-id';
  const senderId = 'ca654';
  const subject = 'my campaign subject';
  const listIds = ['ca43546'];
  const name = 'my campaign';
  const body = 'my campaign body';
  const compressedBody = compressString(body);
  const updatedBody = 'New updated body';
  const campaignId = 'some-campaign-id';
  const freeUserPlan = 'free';
  const campaign = { userId, senderId, subject, listIds, name, body, id: campaignId, status: 'draft' };
  const updatedCampaign = { userId, senderId, subject, listIds, name, body: updatedBody, id: campaignId, status: 'draft' };
  const nonReadyCampaign = { userId, subject, name, body: updatedBody, id: campaignId };
  const user = { id: userId, plan: freeUserPlan, phoneNumber: '123456789', address: { city: 'A Coruña' } }
  const userWithPlan = { id: userId, plan: 'plan', phoneNumber: '123456789', address: { city: 'A Coruña' } }

  describe('#sendCampaign', () => {
    before(() => {
      awsMock.mock('SNS', 'publish', { ReceiptHandle: 'STRING_VALUE' });
      snsClient = new AWS.SNS();
    });

    context('when the campaign cannot be sent', () => {
      context('because the user has exceeded the subscription quota', () => {
        before(() => {
          deliverCampaignService = new DeliverScheduledCampaignService(snsClient, { campaignId, user });
          sinon.stub(Campaign, 'sentLastNDays').resolves(10);
          sinon.stub(deliverCampaignService, '_updateCampaignStatus').resolves({});
          sinon.stub(deliverCampaignService, '_getRecipientsCount').resolves(10);
          sinon.stub(deliverCampaignService, '_getTotalRecipients').resolves(100);
          sinon.stub(FunctionsClient, 'execute').resolves({ quotaExceeded: true });
        });

        it('updates the campaign status', (done) => {
          const sendCampaignPromise = deliverCampaignService.sendCampaign();
          sendCampaignPromise.then(() => {
            expect(deliverCampaignService._updateCampaignStatus).to.have.been.calledWith('limitReached');
            done();
          }).catch(done);
        });

        after(() => {
          Campaign.sentLastNDays.restore();
          deliverCampaignService._updateCampaignStatus.restore();
          deliverCampaignService._getTotalRecipients.restore();
          FunctionsClient.execute.restore();
        });
      });

      context('because is not ready to be sent', () => {
        before(() => {
          sinon.stub(Campaign, 'get').resolves(nonReadyCampaign);
          deliverCampaignService = new DeliverScheduledCampaignService(snsClient, { campaignId, user: userWithPlan });
          sinon.stub(Campaign, 'sentLastNDays').resolves(10);
          sinon.stub(deliverCampaignService, '_updateCampaignStatus').resolves({});
          sinon.stub(deliverCampaignService, '_getRecipientsCount').resolves(10);
          sinon.stub(deliverCampaignService, '_getTotalRecipients').resolves(100);
          sinon.stub(FunctionsClient, 'execute').resolves({ quotaExceeded: false });
        });

        it('updates the campaign status', (done) => {
          const sendCampaignPromise = deliverCampaignService.sendCampaign();
          sendCampaignPromise.then(() => {
            expect(deliverCampaignService._updateCampaignStatus).to.have.been.calledWith('campaignNotReady');
            done();
          }).catch(done);
        });

        after(() => {
          Campaign.get.restore();
          Campaign.sentLastNDays.restore();
          deliverCampaignService._getRecipientsCount.restore();
          deliverCampaignService._getTotalRecipients.restore();
          deliverCampaignService._updateCampaignStatus.restore();
          FunctionsClient.execute.restore();
        });
      });
    });

    context('when campaign id and user id were provided', () => {
      const campaignMetadata = { address: { city: 'A Coruña' } };
      beforeEach(() => {
        sinon.stub(Campaign, 'get').resolves(campaign);
        sinon.stub(Campaign, 'cancelSchedule').resolves(true);
        deliverCampaignService = new DeliverScheduledCampaignService(snsClient, { campaignId, user: userWithPlan });
        sinon.stub(deliverCampaignService, '_updateCampaignStatus').resolves(true);
        sinon.stub(Campaign, 'sentLastNDays').resolves(10);
        sinon.stub(deliverCampaignService, '_getRecipientsCount').resolves(10);
        sinon.stub(deliverCampaignService, '_getTotalRecipients').resolves(100);
        sinon.stub(FunctionsClient, 'execute').resolves({ quotaExceeded: false });
      });
      afterEach(() => {
        Campaign.get.restore();
        Campaign.cancelSchedule.restore();
        Campaign.sentLastNDays.restore();
        deliverCampaignService._getRecipientsCount.restore();
        deliverCampaignService._getTotalRecipients.restore();
        deliverCampaignService._updateCampaignStatus.restore();
        FunctionsClient.execute.restore();
      });

      it('fetches the campaign from DB and sends it to the topic', (done) => {
        deliverCampaignService.sendCampaign().then(() => {
          const args = Campaign.get.lastCall.args;
          expect(args[0]).to.equal(userId);
          expect(args[1]).to.equal(campaignId);
          const snsPayload = JSON.parse(snsClient.publish.lastCall.args[0].Message);
          expect(snsPayload).to.have.property('userId', userId);
          expect(snsPayload).to.have.deep.property('campaign.id', campaignId);
          expect(snsPayload).to.have.deep.property('campaign.subject', subject);
          expect(snsPayload).to.have.deep.property('campaign.body', compressedBody);
          expect(snsPayload).to.have.deep.property('campaign.senderId', senderId);
          expect(snsPayload).to.have.deep.property('campaign.listIds');
          expect(snsPayload).to.have.deep.property('campaign.precompiled', false);
          const actualMetadata = snsPayload.campaign.metadata;
          expect(actualMetadata).to.deep.equal(campaignMetadata);
          expect(snsPayload.currentUserState).to.exist;
          done();
        }).catch(err => done(err));
      });

      it('should unschedule the campaign', (done) => {
        deliverCampaignService.sendCampaign().then(() => {
          expect(Campaign.cancelSchedule).to.have.been.calledOnce.and.calledWith(userId, campaignId);
          done();
        }).catch(done);
      });
    });

    after(() => {
      awsMock.restore('SNS');
    });
  });
});
