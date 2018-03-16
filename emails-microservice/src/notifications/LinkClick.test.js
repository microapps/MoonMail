import { expect } from 'chai';
import LinkClick from './LinkClick';

describe('LinkClick', () => {
  describe('.isValid()', () => {
    const campaignId = 'campaign-id';
    const linkId = 'link-id';
    const listId = 'list-id';
    const recipientId = 'recipient-id';
    const userId = 'user-id';
    const segmentId = 'segment-id';
    const httpHeaders = { Host: 'localhost', 'User-Agent': 'Firefox' };

    context('when the notification is valid', () => {
      it('returns true', () => {
        const testCases = [
          { campaignId, listId, linkId, recipientId, userId, segmentId, httpHeaders },
          { campaignId, listId, linkId, recipientId, userId, httpHeaders },
          { campaignId, listId, linkId, recipientId, userId }
        ];
        testCases.forEach(testCase => expect(LinkClick.isValid(testCase)).to.be.true);
      });
    });

    context('when the notification is not valid', () => {
      it('returns false', () => {
        const testCases = [
          { linkId, listId, recipientId, userId, segmentId, httpHeaders },
          { campaignId, listId, recipientId, userId, httpHeaders },
          { campaignId, linkId, recipientId, userId }
        ];
        testCases.forEach(testCase => expect(LinkClick.isValid(testCase)).to.be.false);
      });
    });
  });
});
