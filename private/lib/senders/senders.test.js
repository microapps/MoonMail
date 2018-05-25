import '../spec_helper';
import Subscriptions from '../subscriptions/index';
import Senders from './index';
import { User } from '../models/user';
import Stats from '../stats/index';
import nock from 'nock';

describe('Senders', () => {
  before(() => {
    process.env.FREE_SENDERS_CONFIG = '{"defaults":{"emailAddress":"no-random@microapps.com","fromName":"Default","region":"us-east-1","apiKey":"AKIAI2X2CX4NYD55JT6A","apiSecret":"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"},"senders":[{"emailAddress":"randomly@microapps.com","fromName":"Random"},{"emailAddress":"randomly+4@microapps.com","fromName":"Random"},{"emailAddress":"randomly+69@microapps.com","fromName":"Random"},{"emailAddress":"randomly+24@microapps.com","fromName":"Random"}]}';
  });

  describe('processing the attachSender message in the campaign sending pipeline', () => {
    context('when the user meets the requirements to send the campaign', () => {
      let inputMessage;
      const userId = 'user-id';
      const userPlan = 'free';
      const senderId = 'sender-id';
      const sentCampaignsInLastDay = Subscriptions.billingPlans.getPlan(userPlan).limits.campaignsPerDay - 1;
      const recipientsCount = Subscriptions.billingPlans.getPlan(userPlan).limits.recipientsPerCampaign - 1;
      const totalRecipients = Subscriptions.billingPlans.getPlan(userPlan).limits.recipientsInTotal - 1;
      const campaign = { id: 'campaign-id', subject: 'Campaign subject' };
      const snsClient = {};

      before(() => {
        inputMessage = { userId, userPlan, campaign, currentUserState: { sentCampaignsInLastDay, recipientsCount, totalRecipients } };
        sinon.stub(Senders, 'publishAttachSenderCanonicalMessage').resolves({});
        sinon.stub(Senders, 'publishAttachSenderUnsuccessfulMessage').resolves({});
        sinon.stub(Stats, 'sendStats').resolves({ sent: 1000, complaint: 0, bounced: 1, sentCampaigns: 10 });
        sinon.stub(User, 'get').resolves({ stripeAccount: { customerId: '1233' }, plan: userPlan, reputationData: { reputation: 15 } });
        sinon.stub(User, 'update').resolves({ stripeAccount: { customerId: '1233' }, plan: userPlan, reputationData: { reputation: 15 } });
      });

      after(() => {
        Stats.sendStats.restore();
        Senders.publishAttachSenderCanonicalMessage.restore();
        Senders.publishAttachSenderUnsuccessfulMessage.restore();
        User.get.restore();
        User.update.restore();
      });
      it('publishes the attachSender canonical message to the right topic', (done) => {
        Senders.attachSender(snsClient, inputMessage).then((result) => {
          expect(Senders.publishAttachSenderCanonicalMessage).to.have.been.calledOnce;
          expect(Senders.publishAttachSenderUnsuccessfulMessage).not.to.have.been.called;
          expect(Senders.publishAttachSenderCanonicalMessage.lastCall.args[1].sender).to.exist;
          done();
        }).catch(error => done(error));
      });
    });

    context('when the user does not meet the requirements to send the campaign', () => {
      context('due to subscriptions limits', () => {
        let inputMessage;
        const userId = 'user-id';
        const userPlan = 'free';
        const senderId = 'sender-id';
        const sentCampaignsInLastDay = Subscriptions.billingPlans.getPlan(userPlan).limits.campaignsPerDay + 1;
        const recipientsCount = Subscriptions.billingPlans.getPlan(userPlan).limits.recipientsPerCampaign;
        const totalRecipients = Subscriptions.billingPlans.getPlan(userPlan).limits.recipientsInTotal;
        const campaign = { id: 'campaign-id', subject: 'Campaign subject' };
        const snsClient = {};

        before(() => {
          inputMessage = { userId, userPlan, campaign, currentUserState: { sentCampaignsInLastDay, recipientsCount, totalRecipients } };
          sinon.stub(Senders, 'publishAttachSenderCanonicalMessage').resolves({});
          sinon.stub(Senders, 'publishAttachSenderUnsuccessfulMessage').resolves({});
          sinon.stub(Stats, 'sendStats').resolves({ sent: 1000, complaint: 0, bounced: 1, sentCampaigns: 10 });
          sinon.stub(User, 'get').resolves({ stripeAccount: { customerId: '1233' }, plan: userPlan, reputationData: { reputation: 15 } });
          sinon.stub(User, 'update').resolves({ stripeAccount: { customerId: '1233' }, plan: userPlan, reputationData: { reputation: 15 } });
        });

        after(() => {
          Stats.sendStats.restore();
          Senders.publishAttachSenderCanonicalMessage.restore();
          Senders.publishAttachSenderUnsuccessfulMessage.restore();
          User.get.restore();
          User.update.restore();
        });
        it('publishes an unsuccessful message to the campaign\'s update status topic', (done) => {
          Senders.attachSender(snsClient, inputMessage).then((result) => {
            expect(Senders.publishAttachSenderCanonicalMessage).not.to.have.been.called;
            expect(Senders.publishAttachSenderUnsuccessfulMessage).to.have.been.calledOnce;
            done();
          }).catch(error => done(error));
        });
      });

      context('due to reputation issues', () => {
        let inputMessage;
        const userId = 'user-id';
        const userPlan = 'free';
        const senderId = 'sender-id';
        const sentCampaignsInLastDay = Subscriptions.billingPlans.getPlan(userPlan).limits.campaignsPerDay - 1;
        const recipientsCount = Subscriptions.billingPlans.getPlan(userPlan).limits.recipientsPerCampaign - 1;
        const totalRecipients = Subscriptions.billingPlans.getPlan(userPlan).limits.recipientsInTotal - 1;
        const campaign = { id: 'campaign-id', subject: 'Campaign subject' };
        const snsClient = {};

        before(() => {
          inputMessage = { userId, userPlan, campaign, currentUserState: { sentCampaignsInLastDay, recipientsCount, totalRecipients } };
          sinon.stub(Senders, 'publishAttachSenderCanonicalMessage').resolves({});
          sinon.stub(Senders, 'publishAttachSenderUnsuccessfulMessage').resolves({});
          sinon.stub(Stats, 'sendStats').resolves({ sent: 2000, complaint: 10, bounced: 100, sentCampaigns: 10 }); // Rep is always 15 when sent is <=1000
          sinon.stub(User, 'get').resolves({ stripeAccount: { customerId: '1233' }, plan: userPlan, reputationData: { reputation: 0, minimumAllowedReputation: 15 } });
          sinon.stub(User, 'update').resolves({ stripeAccount: { customerId: '1233' }, plan: userPlan, reputationData: { reputation: 0, minimumAllowedReputation: 15 } });
        });

        after(() => {
          Stats.sendStats.restore();
          Senders.publishAttachSenderCanonicalMessage.restore();
          Senders.publishAttachSenderUnsuccessfulMessage.restore();
          User.get.restore();
          User.update.restore();
        });
        it('publishes an unsuccessful message to the campaign\'s update status topic', (done) => {
          Senders.attachSender(snsClient, inputMessage).then((result) => {
            expect(Senders.publishAttachSenderCanonicalMessage).not.to.have.been.called;
            expect(Senders.publishAttachSenderUnsuccessfulMessage).to.have.been.calledOnce;
            done();
          }).catch(error => done(error));
        });
      });
    });

    context('ensures that emails are charged', () => {
      let inputMessage;
      let stripeApi;
      const userId = 'user-id';
      const userPlan = 'paid';
      const senderId = 'sender-id';
      const sentCampaignsInLastDay = 10;
      const recipientsCount = 2000;
      const totalRecipients = 10;
      const campaign = { id: 'campaign-id', subject: 'Campaign subject', senderId };
      const snsClient = {};

      before(() => {
        inputMessage = { userId, userPlan, campaign, currentUserState: { sentCampaignsInLastDay, recipientsCount, totalRecipients } };
        sinon.stub(Senders, 'publishAttachSenderCanonicalMessage').resolves({});
        sinon.stub(Senders, 'publishAttachSenderUnsuccessfulMessage').resolves({});
        sinon.stub(Stats, 'sendStats').resolves({ sent: 1000, complaint: 0, bounced: 1, sentCampaigns: 10 });
        sinon.stub(User, 'get').resolves({ stripeAccount: { customerId: '1233' }, plan: userPlan, reputationData: { reputation: 15 }, senders: [{ id: 'sender-id', verified: true }], ses: { some: 'data' } });
        sinon.stub(User, 'update').resolves({ stripeAccount: { customerId: '1233' }, plan: userPlan, reputationData: { reputation: 15 } });
        stripeApi = nock('https://api.stripe.com');
        stripeApi
          .post('/v1/charges')
          .reply(201, {});
      });

      after(() => {
        Stats.sendStats.restore();
        Senders.publishAttachSenderCanonicalMessage.restore();
        Senders.publishAttachSenderUnsuccessfulMessage.restore();
        User.get.restore();
        User.update.restore();
        nock.cleanAll();
      });
      it('charges and publishes the attachSender canonical message to the right topic', (done) => {
        Senders.attachSender(snsClient, inputMessage).then((result) => {
          expect(Senders.publishAttachSenderCanonicalMessage).to.have.been.calledOnce;
          expect(Senders.publishAttachSenderUnsuccessfulMessage).not.to.have.been.called;
          expect(Senders.publishAttachSenderCanonicalMessage.lastCall.args[1].sender).to.exist;
          expect(stripeApi.isDone()).to.be.true;
          done();
        }).catch(error => done(error));
      });
    });
  });
});
