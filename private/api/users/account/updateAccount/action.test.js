import chai from 'chai';
import { respond } from './action';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import 'sinon-as-promised';
import { UpdateUserAccountService } from '../lib/update_user_account_service';
import * as decrypt from '../../../../lib/auth-token-decryptor';

const expect = chai.expect;
chai.use(sinonChai);

describe('updateAccount', () => {
  describe('#respond()', () => {
    context('when the token is valid', () => {
      const userId = 'ca654';
      const userAccount = {
        id: userId,
        plan: 'free',
        sendingQuota: 50000,
        paymentMethod: { brand: 'Visa' }
      };
      beforeEach(() => {
        sinon.stub(decrypt, 'default').resolves({ sub: userId });
        sinon.stub(UpdateUserAccountService, 'updateAccount').resolves(userAccount);
      });
      afterEach(() => {
        decrypt.default.restore();
        UpdateUserAccountService.updateAccount.restore();
      });

      it('returns the user account', (done) => {
        const event = { authToken: 'token', address: { addr: 'val' }, expertData: { key: 'val' } };
        respond(event, (err, result) => {
          expect(result).to.deep.equal(userAccount);
          expect(err).to.not.exist;
          done();
        });
      });

      it('should save address and expertData', (done) => {
        const event = { authToken: 'token', address: { addr: 'val' }, expertData: { key: 'val' } };
        respond(event, () => {
          try {
            const expectedParams = {
              address: event.address,
              expertData: event.expertData,
              payPalEmail: undefined,
              notifications: undefined,
              vat: undefined
            };
            expect(UpdateUserAccountService.updateAccount.lastCall.args).to.deep.equals([userId, expectedParams]);
            done();
          } catch (err) {
            done(err);
          }
        });
      });

      it('should save payPalEmail', (done) => {
        const event = { authToken: 'token', address: { addr: 'val' }, expertData: { key: 'val' } };
        const payPalEmail = 'paypal@gmail.com';
        event.payPalEmail = payPalEmail;
        respond(event, () => {
          try {
            const expectedParams = {
              address: event.address,
              expertData: event.expertData,
              payPalEmail,
              notifications: undefined,
              vat: undefined
            };
            expect(UpdateUserAccountService.updateAccount.lastCall.args).to.deep.equals([userId, expectedParams]);
            done();
          } catch (err) {
            done(err);
          }
        });
      });

      it('should save vat', (done) => {
        const event = { authToken: 'token', address: { addr: 'val' }, expertData: { key: 'val' } };
        const vat = 'vatvatvat';
        event.vat = vat;
        event.payPalEmail = undefined;
        respond(event, () => {
          try {
            const expectedParams = {
              address: event.address,
              expertData: event.expertData,
              payPalEmail: undefined,
              notifications: undefined,
              vat
            };
            expect(UpdateUserAccountService.updateAccount.lastCall.args).to.deep.equals([userId, expectedParams]);
            done();
          } catch (err) {
            done(err);
          }
        });
      });
    });

    context('when the token is not valid', () => {
      const event = { authToken: 'token', address: { addr: 'val' }, expertData: { key: 'val' } };
      const userId = 'ca654';
      const userAccount = {
        id: userId,
        plan: 'free',
        sendingQuota: 50000,
        paymentMethod: { brand: 'Visa' }
      };
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
