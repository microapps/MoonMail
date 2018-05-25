import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import CreateStripeSubscriptionService from './create_stripe_subscription_service';
import { User } from '../models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('CreateStripeSubscriptionService', () => {
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
      before(() => {
        createStripeSubscriptionService = new CreateStripeSubscriptionService(userId, stripePlan);
        sinon.stub(createStripeSubscriptionService, '_createStripeSubscription').resolves(subscription);
        sinon.stub(User, 'get').resolves(user);
        sinon.stub(User, 'update').resolves({});
      });

      it('calls the related services passing the right parameters', (done) => {
        createStripeSubscriptionService.create().then(() => {
          expect(User.get.lastCall.args[0]).to.equal(userId);
          expect(createStripeSubscriptionService._createStripeSubscription.lastCall.args[0]).to.deep.equal({ customer: user.stripeAccount.customerId, plan: stripePlan });
          expect(User.update.lastCall.args[0]).to.deep.equal({
            stripeAccount: {
              subscriptionId: subscription.id,
              customerId: 'customer-id',
              last4: '4242',
              expMonth: 7,
              expYear: 2017,
              country: 'ES'
            }
          });
          expect(User.update.lastCall.args[1]).to.equal(userId);
          done();
        }).catch(err => done(err));
      });

      after(() => {
        createStripeSubscriptionService._createStripeSubscription.restore();
        User.get.restore();
        User.update.restore();
      });
    });

    context('when something was wrong', () => {
      before(() => {
        createStripeSubscriptionService = new CreateStripeSubscriptionService(userId, stripePlan);
        sinon.stub(createStripeSubscriptionService, '_createStripeSubscription').rejects({ type: 'StripeError' });
        sinon.stub(User, 'get').resolves(user);
        sinon.stub(User, 'update').resolves({});
      });

      it('rejects with an error and breaks the flow', (done) => {
        createStripeSubscriptionService.create().catch((error) => {
          expect(error.type).to.equals('StripeError');
          expect(User.update).to.have.been.not.called;
          done();
        });
      });

      after(() => {
        createStripeSubscriptionService._createStripeSubscription.restore();
        User.get.restore();
        User.update.restore();
      });
    });
  });
});
