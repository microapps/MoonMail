import { expect } from 'chai';
import R from 'ramda';
import SesNotification from './SesNotification';
import delivery from './fixtures/delivery.json';
import bounce from './fixtures/bounce.json';
import complaint from './fixtures/complaint.json';

describe('SesNotification', () => {
  describe('.isValid()', () => {
    context('when the notification is valid', () => {
      it('returns true', () => {
        const testCases = [delivery, bounce, complaint];
        testCases.forEach(testCase => expect(SesNotification.isValid(testCase)).to.be.true);
      });
    });

    context('when the notification is not valid', () => {
      it('returns false', () => {
        const testCases = [
          {
            notificationType: 'Delivery',
            mail: { headers: [{ name: 'No', value: 'campaign metadata' }] }
          },
          {
            notificationType: 'Complaint',
            mail: {
              headers: [
                { name: 'X-Moonmail-User-ID', value: 'id' },
                { name: 'X-Moonmail-Campaign-ID', value: 'id' },
                { name: 'X-Moonmail-List-ID', value: 'id' },
                { name: 'Lacks', value: 'recipient id' }
              ]
            }
          },
          R.assoc('notificationType', 'NotHandled', delivery)
        ];
        testCases.forEach(testCase => expect(SesNotification.isValid(testCase)).to.be.false);
      });
    });
  });
});
