import { expect } from 'chai';
import R from 'ramda';
import SesNotification from './SesNotification';
import delivery from './fixtures/delivery.json';

describe('SesNotification', () => {
  const bounce = R.pipe(
    R.assoc('notificationType', 'Bounce'),
    R.assoc('bounce', { bounceType: 'Permanent' }),
    R.dissoc('delivery')
  )(delivery);
  const complaint = R.pipe(
    R.assoc('notificationType', 'Complaint'),
    R.assoc('complaint', { complaintFeedbackType: 'abuse' }),
    R.dissoc('delivery')
  )(delivery);

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
