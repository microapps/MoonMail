import { expect } from 'chai';
import EmailOpen from './EmailOpen';

describe('EmailOpen', () => {
  describe('.isValid()', () => {
    const campaignId = 'campaign-id';
    const listId = 'list-id';
    const recipientId = 'recipient-id';
    const userId = 'user-id';
    const segmentId = 'segment-id';
    const httpHeaders = { Host: 'localhost', 'User-Agent': 'Firefox' };

    context('when the notification is valid', () => {
      it('returns true', () => {
        const testCases = [
          { campaignId, listId, recipientId, userId, segmentId, httpHeaders },
          { campaignId, listId, recipientId, userId, httpHeaders },
          { campaignId, listId, recipientId, userId }
        ];
        testCases.forEach(testCase => expect(EmailOpen.isValid(testCase)).to.be.true);
      });
    });

    context('when the notification is not valid', () => {
      it('returns false', () => {
        const testCases = [
          { listId, recipientId, userId, segmentId, httpHeaders },
          { campaignId, recipientId, userId, httpHeaders },
          { campaignId, recipientId, userId }
        ];
        testCases.forEach(testCase => expect(EmailOpen.isValid(testCase)).to.be.false);
      });
    });
  });
});
