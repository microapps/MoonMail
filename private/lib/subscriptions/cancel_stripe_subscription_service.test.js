import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import CancelStripeSubscriptionService from './cancel_stripe_subscription_service';
import { User } from '../models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('CancelStripeSubscriptionService', () => {
  let cancelStripeSubscriptionService;
  const userId = 'user-id';
  const user = {
    id: 'some-user',
    some: 'attr',
    email: 'some@email.com',
    stripeAccount: {
      customerId: 'customer',
      last4: '4242',
      brand: 'VISA',
      name: 'Carlos Castellanos',
      createdAt: 1469030775,
      country: 'ES',
      subscriptionId: 'sub-id'
    }
  };

  describe('#cancel()', () => {
    context('when everything goes fine', () => {
      before(() => {
        cancelStripeSubscriptionService = new CancelStripeSubscriptionService(userId);
        sinon.stub(cancelStripeSubscriptionService, '_cancelStripeSubscription').resolves({ id: 'sub-id', object: 'subscription' });
        sinon.stub(User, 'get').resolves(user);
        sinon.stub(User, 'update').resolves({});
      });

      it('calls stripe and the other guys passing the right parameters', (done) => {
        cancelStripeSubscriptionService.cancel().then(() => {
          expect(User.get.lastCall.args[0]).to.equal(userId);
          expect(cancelStripeSubscriptionService._cancelStripeSubscription.lastCall.args[0]).to.deep.equal(user.stripeAccount.customerId);
          expect(User.update.lastCall.args[0]).to.deep.equal({
            stripeAccount: {
              customerId: 'customer',
              last4: '4242',
              brand: 'VISA',
              name: 'Carlos Castellanos',
              createdAt: 1469030775,
              country: 'ES'
            }
          });
          expect(User.update.lastCall.args[1]).to.equal(userId);
          done();
        }).catch(err => done(err));
      });

      after(() => {
        cancelStripeSubscriptionService._cancelStripeSubscription.restore();
        User.get.restore();
        User.update.restore();
      });
    });

    context('when something was wrong', () => {
      before(() => {
        cancelStripeSubscriptionService = new CancelStripeSubscriptionService(userId);
        sinon.stub(cancelStripeSubscriptionService, '_cancelStripeSubscription').rejects({ type: 'StripeChargeError' });
        sinon.stub(User, 'get').resolves(user);
        sinon.stub(User, 'update').resolves({});
      });

      it('rejects with an error and breaks the flow', (done) => {
        cancelStripeSubscriptionService.cancel().catch((error) => {
          expect(error.type).to.equals('StripeChargeError');
          expect(User.update).to.have.been.not.called;
          done();
        });
      });

      after(() => {
        cancelStripeSubscriptionService._cancelStripeSubscription.restore();
        User.get.restore();
        User.update.restore();
      });
    });
  });
});
