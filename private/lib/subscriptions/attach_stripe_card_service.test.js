import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import AttachStripeCardService from './attach_stripe_card_service';
import { User } from '../models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('AttachStripeCardService', () => {
  let attachStripeCardService;
  const userId = 'user-id';
  const token = 'new-card-id';
  const user = { id: 'some-user', some: 'attr', email: 'some@email.com', stripeAccount: { customerId: 'customer', cardId: 'old-card-id', subscriptionId: 'sub-id' } };
  const card = {
    id: 'new-card-id'
  };
  const customer = {
    id: 'customer',
    created: 1469030775,
    default_source: 'new-card-id',
    sources: {
      data: [
        {
          id: 'new-card-id',
          last4: '4242',
          brand: 'VISA',
          name: 'Carlos Castellanos',
          country: 'ES'
        }
      ]
    }
  };

  describe('#create()', () => {
    before(() => {
      attachStripeCardService = new AttachStripeCardService(userId, token);
      sinon.stub(attachStripeCardService, '_createStripeCard').resolves(card);
      sinon.stub(attachStripeCardService, '_updateCustomerSource').resolves(customer);
      sinon.stub(User, 'get').resolves(user);
      sinon.stub(User, 'update').resolves({});
    });

    it('creates the card and sets it as default source for de customer', (done) => {
      attachStripeCardService.create().then(() => {
        expect(User.get.lastCall.args[0]).to.equal(userId);
        expect(attachStripeCardService._createStripeCard.lastCall.args).to.deep.equal([customer.id, { source: token }]);
        expect(attachStripeCardService._updateCustomerSource.lastCall.args).to.deep.equal([customer.id, { default_source: token }]);
        expect(User.update.lastCall.args[0]).to.deep.equal({
          stripeAccount: {
            customerId: 'customer',
            cardId: 'new-card-id',
            last4: '4242',
            brand: 'VISA',
            name: 'Carlos Castellanos',
            country: 'ES',
            createdAt: 1469030775,
            subscriptionId: 'sub-id'
          }
        });
        expect(User.update.lastCall.args[1]).to.equal(userId);
        done();
      }).catch(err => done(err));
    });

    after(() => {
      attachStripeCardService._createStripeCard.restore();
      attachStripeCardService._updateCustomerSource.restore();
      User.get.restore();
      User.update.restore();
    });
  });
});
