import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import { respond } from './action';
import { GetUserAccountService } from '../lib/get_user_account_service';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import { User } from '../../../../lib/models/user';
import ApiKeys from '../../../../lib/api-keys';

chai.use(sinonChai);
const expect = chai.expect;

describe('generateApiKey', () => {
  const userId = 'ca654';
  const userAccount = {
    id: userId,
    plan: 'paid',
    sendingQuota: 50000,
    paymentMethod: { brand: 'Visa' }
  };
  const userWithKeyId = 'user-with-key-id';
  const apiKey = 'some-key';
  const apiKeyId = 'some-key-id';
  const newApiKeyResponse = { value: apiKey, id: apiKeyId };
  const userWithApiKey = Object.assign(
    {},
    userAccount,
    { apiKey, id: userWithKeyId }
  );

  describe('#respond()', () => {
    beforeEach(() => {
      const authErr = new Error();
      authErr.name = 'TokenExpiredError';
      sinon.stub(decrypt, 'default')
        .withArgs('foo').resolves({ sub: userId })
        .withArgs('bar').resolves({ sub: userWithKeyId })
        .withArgs('baz').rejects(authErr);
      sinon.stub(GetUserAccountService, 'getAccount')
        .withArgs(userId).resolves(userAccount)
        .withArgs(userWithKeyId).resolves(userWithApiKey);
      sinon.stub(User, 'update').resolves(true);
      sinon.stub(ApiKeys, 'create').resolves({ apiKey: newApiKeyResponse });
    });
    afterEach(() => {
      decrypt.default.restore();
      GetUserAccountService.getAccount.restore();
      User.update.restore();
      ApiKeys.create.restore();
    });

    context('when the token is valid', () => {
      context('and the user does not have an API key', () => {
        const event = { authToken: 'foo' };

        it('generates an API Key', (done) => {
          respond(event, (err, result) => {
            if (err) done(err);
            expect(ApiKeys.create).to.have.been.calledWithExactly({ userId });
            done();
          });
        });

        it('saves the user API key and API key ID', (done) => {
          respond(event, (err, result) => {
            if (err) done(err);
            expect(User.update).to.have.been.calledWithExactly({ apiKey, apiKeyId }, userId);
            done();
          });
        });
      });

      context('and already has an API Key', () => {
        const event = { authToken: 'bar' };

        it('returns an error', (done) => {
          respond(event, (err, res) => {
            const jsonErr = JSON.parse(err);
            expect(jsonErr).to.have.property('name', 'AlreadyEntitled');
            expect(res).not.to.exist;
            done();
          });
        });
      });
    });

    context('when the token is not valid', () => {
      it('returns an auth error', (done) => {
        const event = { authToken: 'baz' };
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          expect(JSON.parse(err)).to.have.property('status');
          done();
        });
      });
    });
  });
});
