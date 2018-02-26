import { expect } from 'chai';
import SesNotification from './SesNotification';
import * as delivery from './fixtures/delivery.json';

describe('SesNotification', () => {
  describe('.isValid()', () => {
    context('when the notification is valid', () => {
      it('returns true', () => {
        const testCases = [delivery];
        testCases.forEach(testCase => expect(SesNotification.isValid(testCase)).to.be.true);
      });
    });

    context('when the notification is not valid', () => {
      it('returns false', () => {
        const testCases = [
          {
            notificationType: 'Delivery',
            mail: { headers: [{ name: 'No', value: 'campaign metadata' }] }
          }
        ];
        testCases.forEach(testCase => expect(SesNotification.isValid(testCase)).to.be.false);
      })
    });
  });
});
