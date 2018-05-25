import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import RetrieveStripeBillingHistoryService from './retrieve_stripe_billing_history_service';
import { User } from '../models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('RetrieveStripeBillingHistoryService', () => {
  let retrieveStripeBillingHistoryService;
  const userId = 'user-id';
  const charges = {
    has_more: false,
    data: [
      { id: 'charge-id' }
    ]
  };
  const user = {
    id: 'some-user',
    some: 'attr',
    email: 'some@email.com',
    stripeAccount: {
      customerId: 'customer'
    }
  };

  describe('#get()', () => {
    before(() => {
      retrieveStripeBillingHistoryService = new RetrieveStripeBillingHistoryService(userId, {});
      sinon.stub(retrieveStripeBillingHistoryService, '_retrieveStripeBillingHistory').resolves(charges);
      sinon.stub(User, 'get').resolves(user);
    });

    it('calls stripe with the correct paramaters', (done) => {
      retrieveStripeBillingHistoryService.get().then(() => {
        expect(User.get.lastCall.args[0]).to.equal(userId);
        expect(retrieveStripeBillingHistoryService._retrieveStripeBillingHistory.lastCall.args[0]).to.deep.equal({ customer: user.stripeAccount.customerId, limit: 10 });
        done();
      }).catch(err => done(err));
    });

    after(() => {
      retrieveStripeBillingHistoryService._retrieveStripeBillingHistory.restore();
      User.get.restore();
    });
  });
});
