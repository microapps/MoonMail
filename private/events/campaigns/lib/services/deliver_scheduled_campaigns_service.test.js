import * as chai from 'chai';
import * as sinon from 'sinon';
import { DeliverScheduledCampaignsService } from './deliver_scheduled_campaigns_service';
import { DeliverScheduledCampaignService } from './deliver_scheduled_campaign_service';
import * as sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import { Campaign } from 'moonmail-models';
import { User } from '../../../../lib/models/user';

const chaiAsPromised = require('chai-as-promised');

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

function objectSubset(obj, keys) {
  return keys.reduce((acumm, key) => {
    acumm[key] = obj[key];
    return acumm;
  }, {});
}

describe('DeliverScheduledCampaignsService', () => {
  const users = [
    { id: 'some-user', plan: 'paid', appendFooter: true, address: { city: 'A Coruña' } },
    { id: 'another-user', appendFooter: false, plan: 'paid' }
  ];
  const campaigns = [
    { scheduledAt: 1234, userId: users[0].id, id: '123', status: 'scheduled', body: 'foo', subject: 'bar', senderId: '678', listIds: [1, 2] },
    { scheduledAt: 1234, userId: users[0].id, id: '1234', status: 'scheduled', body: 'foo', subject: 'bar', senderId: '678', listIds: [1, 2] },
    { scheduledAt: 1234, userId: users[0].id, id: '12345', status: 'scheduled', body: 'foo', subject: 'bar', senderId: '678', listIds: [1, 2] },
    { scheduledAt: 1234, userId: users[1].id, id: '123456', status: 'scheduled', body: 'foo', subject: 'bar', senderId: '678', listIds: [1, 2] }
  ];
  const user = { id: 'some-id', plan: 'free', phoneNumber: '123456789', address: { city: 'A Coruña' } }
  const scheduledInPast = campaigns.map(campaign => objectSubset(campaign, ['scheduledAt', 'userId', 'status', 'id']));
  let service;
  const deliverService = sinon.createStubInstance(DeliverScheduledCampaignService);
  deliverService.sendCampaign.resolves(true);
  const snsClient = {};

  describe('#execute', () => {
    beforeEach(() => {
      sinon.stub(Campaign, 'scheduledInPast').resolves(scheduledInPast);
      service = new DeliverScheduledCampaignsService(snsClient);
      sinon.stub(User, 'get')
        .withArgs(users[0].id).resolves(users[0])
        .withArgs(users[1].id)
        .resolves(users[1]);
      deliverService.sendCampaign.reset();
      sinon.stub(service, '_createDeliverService').returns(deliverService);
    });
    it('should gather scheduled campaigns', (done) => {
      service.execute().then(() => {
        expect(Campaign.scheduledInPast).to.have.been.calledOnce;
        done();
      }).catch(done);
    });

    it('should fetch users\' information', (done) => {
      service.execute().then(() => {
        expect(User.get.withArgs(users[0].id)).to.have.been.calledOnce;
        expect(User.get.withArgs(users[1].id)).to.have.been.calledOnce;
        done();
      }).catch(done);
    });

    it('should deliver campaigns sequentially by user', (done) => {
      service.execute().then(() => {
        expect(service._createDeliverService).to.have.callCount(campaigns.length);
        campaigns.reduce((acumm, campaign) => {
          const user = users.find(u => u.id === campaign.userId);
          const campaignMetadata = {address: user.address};
          expect(service._createDeliverService).to.have.been.calledWithMatch(user, campaign.id);
        }, {});
        expect(deliverService.sendCampaign).to.have.callCount(campaigns.length);
        done();
      }).catch(done);
    });
    afterEach(() => {
      Campaign.scheduledInPast.restore();
      User.get.restore();
      service._createDeliverService.restore();
    });
  });
});
