import { expect } from 'chai';
import Api from './Api';
import IncrementReportCounters from './commandHandlers/IncrementReportCounters';

describe('Api', () => {
  describe('.processEmailNotifications', () => {
    it('delegates on IncrementReportCounters', () => {
      expect(Api.processEmailNotifications).to.equal(IncrementReportCounters.execute);
    });
  });
});
