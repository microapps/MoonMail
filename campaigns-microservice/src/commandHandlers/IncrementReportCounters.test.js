import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import IncrementReportCounters from './IncrementReportCounters';
import ReportRepository from '../repositories/Report';

const { expect } = chai;
chai.use(sinonChai);

describe('IncrementReportCounters', () => {
  describe('.execute', () => {
    const aCampaignId = 'a-campaign-id';
    const anotherCampaignId = 'another-campaign-id';
    const events = [
      { type: 'email.delivered', payload: { campaignId: aCampaignId } },
      { type: 'email.delivered', payload: { campaignId: aCampaignId } },
      { type: 'email.delivered', payload: { campaignId: aCampaignId } },
      { type: 'email.bounced', payload: { campaignId: aCampaignId, bounceType: 'Transient' } },
      { type: 'email.bounced', payload: { campaignId: aCampaignId } },
      { type: 'email.reported', payload: { campaignId: anotherCampaignId } },
      { type: 'email.reported', payload: { without: 'campaignId' } },
      { type: 'email.notsupported', payload: { campaignId: aCampaignId } }
    ];

    beforeEach(() => sinon.stub(ReportRepository, 'incrementCounters').resolves(true));
    afterEach(() => ReportRepository.incrementCounters.restore());

    it('increments the appropriate report counters', async () => {
      const expectations = [
        [aCampaignId, { softBouncesCount: 1, bouncesCount: 1, sentCount: 3 }],
        [anotherCampaignId, { complaintsCount: 1 }]
      ];
      await IncrementReportCounters.execute(events);
      expect(ReportRepository.incrementCounters).to.have.callCount(expectations.length);
      expectations.forEach((expected) => {
        expect(ReportRepository.incrementCounters).to.have.been.calledWithExactly(...expected);
      });
    });
  });
});
