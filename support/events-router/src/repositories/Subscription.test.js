import { expect } from 'chai';
import Subscription from './Subscription';

describe('Subscription', () => {
  describe('.getAll', () => {
    const subscriptions = [
      { type: 'event.type', subscriberType: 'kinesis', subscribedResource: 'StreamName' },
      { type: 'another.event.type', subscriberType: 'kinesis', subscribedResource: 'AnotherStreamName' }
    ];
    before(() => process.env.EVENT_SUBSCRIPTIONS = JSON.stringify(subscriptions));
    after(() => delete process.env.EVENT_SUBSCRIPTIONS);

    it('returns all the configured subscriptions in the environment', async () => {
      const actual = await Subscription.getAll();
      expect(actual).to.deep.equal(subscriptions);
    });
  });
});
