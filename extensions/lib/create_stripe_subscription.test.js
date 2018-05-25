import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import CreateStripeSubscription from './create_stripe_subscription';
import { User } from './models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('CreateStripeSubscription', () => {
  let createStripeSubscriptionService;
  const userId = 'user-id';
  const stripePlan = 'default_paid_monthly';
  const user = {
    id: 'some-user',
    some: 'attr',
    email: 'some@email.com',
    stripeAccount: {
      customerId: 'customer-id',
      last4: '4242',
      expMonth: 7,
      expYear: 2017,
      country: 'ES'
    }
  };
  const subscription = { id: 'subscription-id' };

  describe('#create()', () => {
    context('when everything goes fine', () => {
      beforeEach(() => {
        createStripeSubscriptionService = new CreateStripeSubscription(userId, stripePlan);
        sinon.stub(createStripeSubscriptionService, '_createStripeSubscription').resolves(subscription);
        sinon.stub(User, 'get').resolves(user);
      });

      it('calls the related services passing the right parameters', (done) => {
        createStripeSubscriptionService.execute().then(() => {
          expect(User.get).to.have.been.calledWithExactly(userId);
          expect(createStripeSubscriptionService._createStripeSubscription)
            .to.have.been.calledWithExactly({ customer: user.stripeAccount.customerId, plan: stripePlan });
          done();
        }).catch(err => done(err));
      });

      it('should return the Stripe response', done => {
        const promise = createStripeSubscriptionService.execute();
        expect(promise).to.eventually.equal(subscription).notify(done);
      });

      afterEach(() => {
        createStripeSubscriptionService._createStripeSubscription.restore();
        User.get.restore();
      });
    });

    context('when something was wrong', () => {
      before(() => {
        createStripeSubscriptionService = new CreateStripeSubscription(userId, stripePlan);
        sinon.stub(createStripeSubscriptionService, '_createStripeSubscription').rejects({ type: 'StripeError' });
        sinon.stub(User, 'get').resolves(user);
      });

      it('rejects with an error and breaks the flow', (done) => {
        createStripeSubscriptionService.execute().catch((error) => {
          expect(error.type).to.equals('StripeError');
          done();
        });
      });

      after(() => {
        createStripeSubscriptionService._createStripeSubscription.restore();
        User.get.restore();
      });
    });
  });
});
