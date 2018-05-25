import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import UpdateStripeSubscriptionService from './update_stripe_subscription_service';
import { User } from '../models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('UpdateStripeSubscriptionService', () => {
  let updateStripeSubscriptionService;
  const newPlanId = 'default_paid_ses_monthly';
  const userId = 'user-id';
  const subscription = {
    id: 'sub-id',
    object: 'subscription',
    created: 1469030007,
    current_period_end: 1471708407,
    current_period_start: 1469030007,
    customer: 'customer',
    plan: { id: newPlanId }
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

  describe('#update()', () => {
    context('when everything goes fine', () => {
      before(() => {
        updateStripeSubscriptionService = new UpdateStripeSubscriptionService(userId, newPlanId);
        sinon.stub(updateStripeSubscriptionService, '_changeSubscriptionPlan').resolves(subscription);
        sinon.stub(User, 'get').resolves(user);
      });

      it('calls the related services passing the right parameters', (done) => {
        updateStripeSubscriptionService.update().then(() => {
          expect(User.get.lastCall.args[0]).to.equal(userId);
          expect(updateStripeSubscriptionService._changeSubscriptionPlan.lastCall.args[0]).to.deep.equal(user);
          expect(updateStripeSubscriptionService._changeSubscriptionPlan.lastCall.args[1]).to.deep.equal(subscription.plan.id);
          done();
        }).catch(err => done(err));
      });

      after(() => {
        updateStripeSubscriptionService._changeSubscriptionPlan.restore();
        User.get.restore();
      });
    });

    context('when something was wrong', () => {
      before(() => {
        updateStripeSubscriptionService = new UpdateStripeSubscriptionService(userId, newPlanId);
        sinon.stub(updateStripeSubscriptionService, '_changeSubscriptionPlan').rejects({ type: 'StripeError' });
        sinon.stub(User, 'get').resolves(user);
      });

      it('rejects with an error and breaks the flow', (done) => {
        updateStripeSubscriptionService.update().catch((error) => {
          expect(error.type).to.equals('StripeError');
          done();
        });
      });

      after(() => {
        updateStripeSubscriptionService._changeSubscriptionPlan.restore();
        User.get.restore();
      });
    });
  });
});
