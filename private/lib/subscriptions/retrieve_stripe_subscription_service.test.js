import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import RetrieveStripeSubscriptionService from './retrieve_stripe_subscription_service';
import { User } from '../models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('RetrieveStripeSubscriptionService', () => {
  let retrieveStripeSubscriptionService;
  const userId = 'user-id';
  const subscription = {
    id: 'sub-id',
    object: 'subscription',
    created: 1469030007,
    current_period_end: 1471708407,
    current_period_start: 1469030007,
    customer: 'customer',
    plan: { id: 'default_paid_monthly' }
  };
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

  describe('#get()', () => {
    context('when everything goes fine', () => {
      before(() => {
        retrieveStripeSubscriptionService = new RetrieveStripeSubscriptionService(userId);
        sinon.stub(retrieveStripeSubscriptionService, '_retrieveStripeSubscription').resolves(subscription);
        sinon.stub(User, 'get').resolves(user);
      });

      it('calls the related services passing the right parameters', (done) => {
        retrieveStripeSubscriptionService.get().then(() => {
          expect(User.get.lastCall.args[0]).to.equal(userId);
          expect(retrieveStripeSubscriptionService._retrieveStripeSubscription.lastCall.args[0]).to.deep.equal(user.stripeAccount.customerId);
          expect(retrieveStripeSubscriptionService._retrieveStripeSubscription.lastCall.args[1]).to.deep.equal(user.stripeAccount.subscriptionId);
          done();
        }).catch(err => done(err));
      });

      after(() => {
        retrieveStripeSubscriptionService._retrieveStripeSubscription.restore();
        User.get.restore();
      });
    });

    context('when something was wrong', () => {
      before(() => {
        retrieveStripeSubscriptionService = new RetrieveStripeSubscriptionService(userId);
        sinon.stub(retrieveStripeSubscriptionService, '_retrieveStripeSubscription').rejects({ type: 'StripeError' });
        sinon.stub(User, 'get').resolves(user);
      });

      it('rejects with an error and breaks the flow', (done) => {
        retrieveStripeSubscriptionService.get().catch((error) => {
          expect(error.type).to.equals('StripeError');
          done();
        });
      });

      after(() => {
        retrieveStripeSubscriptionService._retrieveStripeSubscription.restore();
        User.get.restore();
      });
    });
  });
});
