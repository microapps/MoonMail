import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import CancelStripeSubscription from './cancel_stripe_subscription';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('CancelStripeSubscription', () => {
  let cancelStripeSubscriptionService;
  const subscriptionId = 'subs-id';

  describe('#execute()', () => {
    context('when everything goes fine', () => {
      beforeEach(() => {
        cancelStripeSubscriptionService = new CancelStripeSubscription(subscriptionId);
        sinon.stub(cancelStripeSubscriptionService, '_cancelStripeSubscription')
          .resolves({ id: 'sub-id', object: 'subscription' });
      });

      it('calls stripe and the other guys passing the right parameters', (done) => {
        cancelStripeSubscriptionService.execute().then(() => {
          expect(cancelStripeSubscriptionService._cancelStripeSubscription)
            .to.have.been.calledWithExactly(subscriptionId);
          done();
        }).catch(err => done(err));
      });

      afterEach(() => {
        cancelStripeSubscriptionService._cancelStripeSubscription.restore();
      });
    });

    context('when something was wrong', () => {
      before(() => {
        cancelStripeSubscriptionService = new CancelStripeSubscription(subscriptionId);
        sinon.stub(cancelStripeSubscriptionService, '_cancelStripeSubscription').rejects({ type: 'StripeChargeError' });
      });

      it('rejects with an error and breaks the flow', (done) => {
        cancelStripeSubscriptionService.execute().catch((error) => {
          expect(error.type).to.equals('StripeChargeError');
          done();
        });
      });

      after(() => {
        cancelStripeSubscriptionService._cancelStripeSubscription.restore();
      });
    });
  });
});
