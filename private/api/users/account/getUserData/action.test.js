import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { User } from '../../../../lib/models/user';
import ReputationControls from '../../../../lib/reputation/index';

const expect = chai.expect;

describe('getUserData', () => {
  const event = {};
  const userId = 'ca654';
  const userData = {
    id: userId,
    plan: 'free',
    sendingQuota: 50000,
    paymentMethod: { brand: 'Visa' },
    reputationData: { reputation: 10 }
  };

  describe('#respond()', () => {
    context('when the token is valid', () => {
      before(() => {
        sinon.stub(User, 'get').resolves(userData);
        sinon.stub(ReputationControls, 'performAndUpdate').resolves({});
      });

      it('returns the user account', (done) => {
        respond(event, (err, result) => {
          expect(result).to.deep.equal(userData);
          expect(err).to.not.exist;
          done();
        });
      });

      after(() => {
        User.get.restore();
        ReputationControls.performAndUpdate.restore();
      });
    });
  });
});
