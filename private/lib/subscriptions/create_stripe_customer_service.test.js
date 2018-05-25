import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import CreateStripeCustomerService from './create_stripe_customer_service';
import { User } from '../models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('CreateStripeCustomerService', () => {
  let createStripeCustomerService;
  const userId = 'user-id';
  const token = 'token';
  const clickIdAffiliateRef = 'affiliateClickId';
  const user = { id: 'some-user', some: 'attr', email: 'some@email.com' };
  const customer = {
    id: 'customer',
    created: 1469030775,
    default_source: 'card-id',
    sources: {
      data: [
        {
          id: 'card-id',
          last4: '4242',
          brand: 'VISA',
          name: 'Carlos Castellanos',
          country: 'ES'
        }
      ]
    }
  };

  describe('#create()', () => {
    context('when everything goes fine', () => {
      before(() => {
        createStripeCustomerService = new CreateStripeCustomerService(userId, token, clickIdAffiliateRef);
        sinon.stub(createStripeCustomerService, '_createStripeCustomer').resolves(customer);
        sinon.stub(User, 'get').resolves(user);
        sinon.stub(User, 'update').resolves({});
      });

      it('calls related services passing the right parameters', (done) => {
        createStripeCustomerService.create().then(() => {
          expect(User.get.lastCall.args[0]).to.equal(userId);
          expect(createStripeCustomerService._createStripeCustomer.lastCall.args[0]).to.deep.equal({ source: token, email: user.email, metadata: { referredOf: clickIdAffiliateRef } });
          expect(User.update.lastCall.args[0]).to.deep.equal({
            stripeAccount: {
              customerId: 'customer',
              last4: '4242',
              brand: 'VISA',
              name: 'Carlos Castellanos',
              createdAt: 1469030775,
              cardId: 'card-id',
              country: 'ES'
            }
          });
          expect(User.update.lastCall.args[1]).to.equal(userId);
          done();
        }).catch(err => done(err));
      });

      after(() => {
        createStripeCustomerService._createStripeCustomer.restore();
        User.get.restore();
        User.update.restore();
      });
    });

    context('when something went wrong', () => {
      before(() => {
        createStripeCustomerService = new CreateStripeCustomerService(userId, token, clickIdAffiliateRef);
        sinon.stub(createStripeCustomerService, '_createStripeCustomer').rejects({ type: 'StripeCardError' });
        sinon.stub(User, 'get').resolves(user);
        sinon.stub(User, 'update').resolves({});
      });

      it('rejects with an error and breaks the flow', (done) => {
        createStripeCustomerService.create().catch((error) => {
          expect(error.type).to.equals('StripeCardError');
          expect(User.update).to.have.been.not.called;
          done();
        });
      });

      after(() => {
        createStripeCustomerService._createStripeCustomer.restore();
        User.get.restore();
        User.update.restore();
      });
    });
  });
});
