import chai from 'chai';
import sinon from 'sinon';
import Promise from 'bluebird';
import { Campaign, List } from 'moonmail-models';
import 'sinon-as-promised';
import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import chaiAsPromised from 'chai-as-promised';
import { DeliverCampaignService } from './deliver_campaign_service';
import { compressString } from '../utils';
import FunctionsClient from '../functions_client';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('DeliverCampaignService', () => {
  let snsClient = 'hahaha';
  let deliverCampaignService;
  const userId = 'some-user-id';
  const senderId = 'ca654';
  const subject = 'my campaign subject';
  const listIds = ['ca43546'];
  const segmentId = '123';
  const name = 'my campaign';
  const body = 'my campaign body';
  const compressedBody = compressString(body);
  const updatedBody = 'New updated body';
  const compressedUpdatedBody = compressString(updatedBody);
  const campaignId = 'some-campaign-id';
  const freeUserPlan = 'free';
  const campaign = { userId, senderId, subject, listIds, name, body, id: campaignId, status: 'draft' };
  const campaignWithSegmentId = { userId, senderId, subject, segmentId, name, body, id: campaignId, status: 'draft' };
  const updatedCampaign = { userId, senderId, subject, listIds, name, body: updatedBody, id: campaignId, status: 'draft' };
  const updatedCampaignWithSegmentId = { userId, senderId, subject, segmentId, name, body: updatedBody, id: campaignId, status: 'draft' };
  const nonReadyCampaign = { userId, subject, name, body: updatedBody, id: campaignId };
  const user = { id: userId, plan: freeUserPlan, phoneNumber: '123456789', address: { city: 'A Coruña' } }
  const userWithPlan = { id: userId, plan: 'plan', phoneNumber: '123456789', address: { city: 'A Coruña' } }

  describe('#sendCampaign', () => {
    before(() => {
      awsMock.mock('SNS', 'publish', { ReceiptHandle: 'STRING_VALUE' });
      snsClient = new AWS.SNS();
    });

    context('when the user has exceeded the subscription quota', () => {
      before(() => {
        deliverCampaignService = new DeliverCampaignService(snsClient, { campaign, campaignId, user });
        sinon.stub(Campaign, 'sentLastNDays').resolves(100);
        sinon.stub(deliverCampaignService, '_getRecipientsCount').resolves(10);
        sinon.stub(deliverCampaignService, '_getTotalRecipients').resolves(100);
        sinon.stub(FunctionsClient, 'execute').resolves({ quotaExceeded: true });
      });

      it('rejects the promise', (done) => {
        const sendCampaignPromise = deliverCampaignService.sendCampaign();
        expect(sendCampaignPromise).to.be.rejectedWith('User can\'t send more campaigns').notify(done);
      });

      after(() => {
        Campaign.sentLastNDays.restore();
        FunctionsClient.execute.restore();
        deliverCampaignService._getRecipientsCount.restore();
        deliverCampaignService._getTotalRecipients.restore();
      });
    });

    context('when the campaign is not ready to be sent', () => {
      before(() => {
        deliverCampaignService = new DeliverCampaignService(snsClient, { campaignId, user });
        sinon.stub(Campaign, 'sentLastNDays').resolves(deliverCampaignService.maxDailyCampaigns - 1);
        sinon.stub(Campaign, 'get').resolves(nonReadyCampaign);
        sinon.stub(List, 'get').resolves({ userId, id: listIds[0], name: 'Some list', subscribedCount: 25 });
        sinon.stub(deliverCampaignService, '_getTotalRecipients').resolves(100);
        sinon.stub(FunctionsClient, 'execute').resolves({ quotaExceeded: false });
      });

      it('rejects the promise', (done) => {
        const sendCampaignPromise = deliverCampaignService.sendCampaign();
        expect(sendCampaignPromise).to.be.rejectedWith('Campaign not ready to be sent').notify(done);
      });

      after(() => {
        Campaign.get.restore();
        List.get.restore();
        Campaign.sentLastNDays.restore();
        FunctionsClient.execute.restore();
        deliverCampaignService._getTotalRecipients.restore();
      });
    });

    context('when only campaign id and user id were provided', () => {
      before(() => {
        sinon.stub(Campaign, 'get').resolves(campaign);
        deliverCampaignService = new DeliverCampaignService(snsClient, { campaignId, user });
        sinon.stub(deliverCampaignService, '_updateCampaignStatus').resolves(true);
        sinon.stub(Campaign, 'sentLastNDays').resolves(deliverCampaignService.maxDailyCampaigns - 1);
        sinon.stub(List, 'get').resolves({ userId, id: listIds[0], name: 'Some list', subscribedCount: 25 });
        sinon.stub(deliverCampaignService, '_getTotalRecipients').resolves(100);
        sinon.stub(FunctionsClient, 'execute').resolves({ quotaExceeded: false });
      });

      it('fetches the campaign from DB and sends it to the topic', (done) => {
        deliverCampaignService.sendCampaign().then((result) => {
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
          expect(snsPayload.currentUserState).to.exist;
          done();
        }).catch(err => done(err));
      });

      after(() => {
        Campaign.get.restore();
        Campaign.sentLastNDays.restore();
        List.get.restore();
        deliverCampaignService._updateCampaignStatus.restore();
        FunctionsClient.execute.restore();
        deliverCampaignService._getTotalRecipients.restore();
      });
    });

    context('when a campaign object was also provided', () => {
      beforeEach(() => {
        sinon.stub(Campaign, 'update').resolves(updatedCampaign);
        sinon.stub(Campaign, 'sentLastNDays').resolves(deliverCampaignService.maxDailyCampaigns - 1);
        sinon.stub(List, 'get').resolves({ userId, id: listIds[0], name: 'Some list', subscribedCount: 25 });
        sinon.stub(FunctionsClient, 'execute').resolves({ quotaExceeded: false });
      });

      afterEach(() => {
        Campaign.sentLastNDays.restore();
        List.get.restore();
        Campaign.update.restore();
        FunctionsClient.execute.restore();
      });

      it('fetches the campaign from DB and sends it to the topic', (done) => {
        deliverCampaignService = new DeliverCampaignService(snsClient, { campaign, campaignId, user: userWithPlan });
        sinon.stub(deliverCampaignService, '_updateCampaignStatus').resolves(true);
        sinon.stub(deliverCampaignService, '_getTotalRecipients').resolves(100);
        deliverCampaignService.sendCampaign().then((result) => {
          const args = Campaign.update.lastCall.args;
          expect(args[1]).to.equal(userId);
          expect(args[2]).to.equal(campaignId);
          const snsPayload = JSON.parse(snsClient.publish.lastCall.args[0].Message);
          expect(snsPayload).to.have.property('userId', userId);
          expect(snsPayload).to.have.deep.property('campaign.id', campaignId);
          expect(snsPayload).to.have.deep.property('campaign.subject', subject);
          expect(snsPayload).to.have.deep.property('campaign.body', compressedUpdatedBody);
          expect(snsPayload).to.have.deep.property('campaign.senderId', senderId);
          expect(snsPayload).to.have.deep.property('campaign.listIds');
          expect(snsPayload).to.have.deep.property('campaign.precompiled', false);
          expect(snsPayload.currentUserState).to.exist;
          done();
        }).catch(err => done(err));
      });

      context('and campaign metadata was provided', () => {
        it('should include it in the canonical message', done => {
          deliverCampaignService = new DeliverCampaignService(snsClient, { campaign, campaignId, user: userWithPlan });
          sinon.stub(deliverCampaignService, '_updateCampaignStatus').resolves(true);
          sinon.stub(deliverCampaignService, '_getTotalRecipients').resolves(100);
          deliverCampaignService.sendCampaign().then((result) => {
            const snsPayload = JSON.parse(snsClient.publish.lastCall.args[0].Message);
            const actualMetadata = snsPayload.campaign.metadata;
            expect(actualMetadata).to.deep.equal({address: userWithPlan.address});
            done();
          })
            .catch(err => done(err));
        });
      });
    });

    context('when the destination is a segment portion instead of lists', () => {
      before(() => {
        sinon.stub(Campaign, 'update').resolves(updatedCampaignWithSegmentId);
        deliverCampaignService = new DeliverCampaignService(snsClient, { campaign: campaignWithSegmentId, campaignId, user: userWithPlan });
        sinon.stub(deliverCampaignService, '_updateCampaignStatus').resolves(true);
        sinon.stub(Campaign, 'sentLastNDays').resolves(deliverCampaignService.maxDailyCampaigns - 1);
        sinon.stub(List, 'get').resolves({ userId, id: listIds[0], name: 'Some list', subscribedCount: 25 });
        sinon.stub(Campaign, 'get').resolves(updatedCampaignWithSegmentId);
        sinon.stub(deliverCampaignService, '_getTotalRecipients').resolves(100);
        sinon.stub(deliverCampaignService, '_getSegmentMembersCount').resolves(5);
        sinon.stub(FunctionsClient, 'execute').resolves({ quotaExceeded: false });
      });

      it('fetches the campaign from DB and sends it to the topic', (done) => {
        deliverCampaignService.sendCampaign().then((result) => {
          const snsPayload = JSON.parse(snsClient.publish.lastCall.args[0].Message);
          expect(snsPayload).to.have.property('userId', userId);
          expect(snsPayload).to.have.deep.property('campaign.id', campaignId);
          expect(snsPayload).to.have.deep.property('campaign.subject', subject);
          expect(snsPayload).to.have.deep.property('campaign.body', compressedUpdatedBody);
          expect(snsPayload).to.have.deep.property('campaign.senderId', senderId);
          expect(snsPayload).to.have.deep.property('campaign.segmentId');
          expect(snsPayload).to.have.deep.property('campaign.precompiled', false);
          expect(snsPayload.currentUserState).to.exist;
          done();
        }).catch(err => done(err));
      });

      after(() => {
        Campaign.sentLastNDays.restore();
        List.get.restore();
        Campaign.get.restore();
        Campaign.update.restore();
        FunctionsClient.execute.restore();
        deliverCampaignService._getTotalRecipients.restore();
        deliverCampaignService._getSegmentMembersCount.restore();
      });
    });

    after(() => {
      awsMock.restore('SNS');
      deliverCampaignService._updateCampaignStatus.restore();
    });
  });
});
