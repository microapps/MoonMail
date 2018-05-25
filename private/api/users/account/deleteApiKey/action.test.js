import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import { respond } from './action';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import { User } from '../../../../lib/models/user';
import ApiKeys from '../../../../lib/api-keys';

chai.use(sinonChai);
const expect = chai.expect;

describe('deleteApiKey', () => {
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
  const userWithApiKey = Object.assign(
    {},
    userAccount,
    { apiKey, apiKeyId, id: userWithKeyId }
  );

  describe('#respond()', () => {
    beforeEach(() => {
      const authErr = new Error();
      authErr.name = 'TokenExpiredError';
      sinon.stub(decrypt, 'default')
        .withArgs('foo').resolves({ sub: userId })
        .withArgs('bar').resolves({ sub: userWithKeyId })
        .withArgs('baz').rejects(authErr);
      sinon.stub(User, 'get')
        .withArgs(userId).resolves(userAccount)
        .withArgs(userWithKeyId).resolves(userWithApiKey);
      sinon.stub(User, 'update').resolves(true);
      sinon.stub(ApiKeys, 'delete').resolves({ apiKey: { value: apiKey } });
    });
    afterEach(() => {
      decrypt.default.restore();
      User.get.restore();
      User.update.restore();
      ApiKeys.delete.restore();
    });

    context('when the token is valid', () => {
      context('and the user has an API key', () => {
        const event = { authToken: 'bar' };

        it('revokes the API Key', (done) => {
          respond(event, (err, result) => {
            if (err) done(err);
            expect(ApiKeys.delete).to.have.been.calledWithExactly({ apiKeyId });
            done();
          });
        });

        it('deletes the user API key', (done) => {
          respond(event, (err, result) => {
            if (err) done(err);
            expect(User.update).to.have.been
              .calledWithExactly({ apiKey: null, apiKeyId: null }, userWithKeyId);
            done();
          });
        });
      });

      context('and the user does not have an API Key', () => {
        const event = { authToken: 'foo' };

        it('returns an error', (done) => {
          respond(event, (err, res) => {
            const jsonErr = JSON.parse(err);
            expect(jsonErr).to.have.property('name', 'NonExistingKey');
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
