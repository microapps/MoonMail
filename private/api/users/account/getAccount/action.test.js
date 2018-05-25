import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { GetUserAccountService } from '../lib/get_user_account_service';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import ReputationControls from '../../../../lib/reputation/index';

const expect = chai.expect;

describe('getAccount', () => {
  const event = {};
  const userId = 'ca654';
  const userAccount = {
    id: userId,
    plan: 'free',
    sendingQuota: 50000,
    paymentMethod: {brand: 'Visa'}
  };

  describe('#respond()', () => {
    context('when the token is valid', () => {
      before(() => {
        sinon.stub(ReputationControls, 'performAndUpdate').resolves({});
        sinon.stub(GetUserAccountService, 'getAccount').resolves(userAccount);
        sinon.stub(decrypt, 'default').resolves({sub: userId});
      });

      it('returns the user account', done => {
        respond(event, (err, result) => {
          expect(result).to.deep.equal(userAccount);
          expect(err).to.not.exist;
          done();
        });
      });

      after(() => {
        ReputationControls.performAndUpdate.restore();
        decrypt.default.restore();
        GetUserAccountService.getAccount.restore();
      });
    });

    context('when the token is not valid', () => {
      before(() => {
        const authErr = new Error();
        authErr.name = 'TokenExpiredError';
        sinon.stub(decrypt, 'default').rejects(authErr);
      });

      it('returns an auth error', (done) => {
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          expect(JSON.parse(err)).to.have.property('status');
          done();
        });
      });

      after(() => decrypt.default.restore());
    });
  });
});
