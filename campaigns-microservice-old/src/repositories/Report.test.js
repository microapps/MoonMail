import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Report } from 'moonmail-models';
import ReportRepo from './Report';

const { expect } = chai;
chai.use(sinonChai);

describe('Report', () => {
  describe('.incrementCounters', () => {
    before(() => sinon.stub(Report, 'incrementAll').resolves(true));
    after(() => Report.incrementAll.restore());

    it('forwards the request to the moonmail-model', async () => {
      const campaignId = 'the-campaign-id';
      const counters = {
        complaintsCount: 5,
        softBouncesCount: 1,
        bouncesCount: 3,
        unsubscribeCount: 2,
        clicksCount: 1,
        opensCount: 9,
        sentCount: 21
      };
      await ReportRepo.incrementCounters(campaignId, counters);
      expect(Report.incrementAll).to.have.been.calledWithExactly(campaignId, null, counters);
    });
  });
});
