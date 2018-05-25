import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import AmazonSubscriptions from '../lib/amazon_subscriptions';
import respond from './action';
import * as decrypt from '../../lib/auth-token-decryptor';
import { User } from '../../lib/models/user';

const expect = chai.expect;
chai.use(sinonChai);

describe('respond()', () => {
  const user = {id: 'uid'};
  const authToken = 'foo';
  const amazonCustomerId = 'customer-id';
  const nonCustomerId = 'non-customer-id';
  const entitledUser = {id: 'user-id', amazonCustomerId, amazonSubscriptionActive: true};
  const entitledAuthToken = 'entitled-token';
  const entitlements = {
    Entitlements: [
      {CustomerIdentifier: amazonCustomerId, Value: {IntegerValue: 2}, Dimension: 'basicUser'},
      {CustomerIdentifier: amazonCustomerId, Value: {IntegerValue: 2}, Dimension: 'basicUser'}
    ]
  };

  before(() => {
    sinon.stub(decrypt, 'default')
      .withArgs(authToken).resolves({sub: user.id})
      .withArgs(entitledAuthToken).resolves({sub: entitledUser.id})
      .withArgs(sinon.match.any).rejects(new Error('InvalidToken'));
    sinon.stub(AmazonSubscriptions, 'getCustomerEntitlements')
      .withArgs(amazonCustomerId).resolves(entitlements)
      .withArgs(nonCustomerId).rejects(new Error('Amazon Error'));
    sinon.stub(User, 'get')
      .withArgs(user.id).resolves(user)
      .withArgs(entitledUser.id).resolves(entitledUser);
  });
  after(() => {
    decrypt.default.restore();
    AmazonSubscriptions.getCustomerEntitlements.restore();
    User.get.restore();
  });

  context('when the customer is incorrect', () => {
    const event = {authToken, amazonCustomerId: nonCustomerId};

    it('should return an error', (done) => {
      respond(event, (err, res) => {
        expect(err).to.exist;
        expect(res).not.to.exist;
        done();
      });
    });
  });

  context('when the customer is correct correct', () => {
    context('and he run out of entitlements', () => {
      const entitledUsers = {items: [1, 2, 3, 4]};
      const event = {authToken, amazonCustomerId};

      before(() => sinon.stub(User, 'entitled').resolves(entitledUsers));
      after(() => User.entitled.restore());

      it('should return an error', (done) => {
        respond(event, (err, res) => {
          const jsonErr = JSON.parse(err);
          expect(jsonErr).to.have.property('name', 'NoEntitlementsLeft');
          expect(res).not.to.exist;
          done();
        });
      });
    });

    context('and he is already entitled', () => {
      const entitledUsers = {items: [1]};
      const event = {authToken: entitledAuthToken, amazonCustomerId};

      before(() => sinon.stub(User, 'entitled').resolves(entitledUsers));
      after(() => User.entitled.restore());

      it('should return an error', (done) => {
        respond(event, (err, res) => {
          const jsonErr = JSON.parse(err);
          expect(jsonErr).to.have.property('name', 'AlreadyEntitled');
          expect(res).not.to.exist;
          done();
        });
      });
    });

    context('and he has more entitlements', () => {
      const entitledUsers = {items: [1]};
      const updatedUser = Object.assign(
        {}, user, {amazonCustomerId, amazonSubscriptionActive: true}
      );
      const event = {authToken, amazonCustomerId};

      beforeEach(() => {
        sinon.stub(User, 'entitled').resolves(entitledUsers);
        sinon.stub(User, 'update')
          .resolves(updatedUser);
      });
      afterEach(() => {
        User.entitled.restore();
        User.update.restore();
      });

      it('should assign him the correct plan and activate account', (done) => {
        respond(event, (err, res) => {
          const plan = AmazonSubscriptions.plansMapping[entitlements.Entitlements[0].Dimension];
          const expected = [
            {amazonCustomerId, amazonSubscriptionActive: true, plan, approved: true},
            user.id
          ];
          expect(User.update).to.have.been.calledWithExactly(...expected);
          done();
        });
      });

      it('should return the updated user', (done) => {
        respond(event, (err, res) => {
          expect(err).not.to.exist;
          expect(res).to.deep.equal(updatedUser);
          done();
        });
      });
    });
  });
});
