import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import Stats from '../stats/index';
import { ReputationManagementService } from './reputation_management_service';
import { User } from '../models/user';
import { BadReputation } from '../errors';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('ReputationManagementService', () => {
  const paidUser = { id: 'user-id', plan: 'paid' };
  const paidSesUser = { id: 'ses-user-id', plan: 'paid_ses' };

  describe('#build()', () => {
    let sendStatsStub;
    before(() => {
      sinon.stub(User, 'get')
        .withArgs(paidUser.id).resolves(paidUser)
        .withArgs(paidSesUser.id).resolves(paidSesUser);
      sendStatsStub = sinon.stub(Stats, 'sendStats');
    });

    it('builds the reputation accordingly', async () => {
      sendStatsStub.resolves({ sent: 1000, bounced: 0, complaint: 1, sentCampaigns: 10 });
      let result = await ReputationManagementService.build(paidUser.id);
      expect(result.reputation).to.equal(15);

      sendStatsStub.resolves({ sent: 50001, bounced: 0, complaint: 1, sentCampaigns: 10 });
      result = await ReputationManagementService.build(paidUser.id);
      expect(result.reputation).to.equal(98.00003999920001);
    });

    context('when the user is paid_ses', () => {
      it('should apply paid_ses limits', async () => {
        sendStatsStub.resolves({ sent: 100000, bounced: 1500, complaint: 0, sentCampaigns: 10 });
        const limits = {
          paid_ses: {
            MINIMUM_ALLOWED_REPUTATION: 2,
            MAX_BOUNCE_RATE_PERCENT: 2,
            MAX_COMPLAINT_RATE_PERCENT: 1
          }
        };
        const result = await ReputationManagementService.build(paidSesUser.id, limits);
        expect(result.reputation).to.equal(25);
        expect(result.minimumAllowedReputation).to.equal(limits.paid_ses.MINIMUM_ALLOWED_REPUTATION);
      });
    });

    after(() => {
      User.get.restore();
      sendStatsStub.restore();
    });
  });


  describe('#buildAndUpdate()', () => {
    before(() => {
      sinon.stub(Stats, 'sendStats').resolves({ sent: 100, bounced: 0, complaint: 1, sentCampaigns: 10 });
      sinon.stub(User, 'update').resolves({ reputationData: 'some-data' });
      sinon.stub(User, 'get').resolves(paidUser);
    });

    it('builds and updates the reputation accordingly', async () => {
      const result = await ReputationManagementService.buildAndUpdate(paidUser.id);
      expect(User.update).to.have.been.called;
    });

    after(() => {
      Stats.sendStats.restore();
      User.update.restore();
      User.get.restore();
    });
  });

  describe('#validate()', () => {
    const userId = 'user-id';
    context('when the user has good reputation', () => {
      before(() => sinon.stub(ReputationManagementService, 'buildAndUpdate').resolves({ reputation: 15, minimumAllowedReputation: 15 }));

      it('resolves true', (done) => {
        const reputationPromise = ReputationManagementService.validate(userId);
        reputationPromise.then((result) => {
          expect(result).to.be.truthy;
          done();
        });
      });

      after(() => ReputationManagementService.buildAndUpdate.restore());
    });

    context('when the user has bad reputation', () => {
      before(() => sinon.stub(ReputationManagementService, 'buildAndUpdate').resolves({ reputation: 14, minimumAllowedReputation: 15 }));

      it('is rejected', (done) => {
        const reputationPromise = ReputationManagementService.validate(userId);
        expect(reputationPromise).to.be.eventually.rejectedWith(BadReputation).notify(done);
      });

      after(() => ReputationManagementService.buildAndUpdate.restore());
    });
  });
});
