import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { UpdateUserAccountService } from './update_user_account_service';
import { User } from '../../../../lib/models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('UpdateUserAccountService', () => {
  describe('.updateAccount', () => {
    const validAddress = {company: 'microapps', websiteUrl: 'moonmail.io', address: 'Severo Ochoa',
      city: 'Málaga', state: 'Málaga', zipCode: '29590', country: 'Spain'};
    const invalidAddress = {city: 'Málaga'};
    const expertData = {anyKey: 'anyValue'};
    const vat = 'somevat';
    const user = {id: 'id', ses: {apiKey: 123}, phoneNumber: '123', address: validAddress, plan: 'free', expertData, vat};

    beforeEach(() => {
      sinon.stub(User, 'update').resolves(user);
    });

    afterEach(() => {
      User.update.restore();
    });

    context('when address is provided', () => {
      context('and it is valid', () => {
        it('should update the user and resolve the account', done => {
          UpdateUserAccountService.updateAccount(user.id, {address: validAddress}).then(account => {
            expect(User.update).to.have.been.calledWithExactly({address: validAddress}, user.id);
            expect(account).not.to.have.property('ses');
            expect(account.address).to.deep.equal(validAddress);
            expect(account).to.have.property('phoneNumber', user.phoneNumber);
            done();
          }).catch(done);
        });
      });

      context('and it is not valid', () => {
        it('should reject the promise', done => {
          const promise = UpdateUserAccountService.updateAccount(user.id, invalidAddress);
          expect(promise).to.be.rejectedWith(Error).notify(done);
        });
      });
    });

    context('when expertData is provided', () => {
      it('should update the user and resolve the account', done => {
        UpdateUserAccountService.updateAccount(user.id, {expertData}).then(account => {
          expect(User.update).to.have.been.calledWithExactly({expertData}, user.id);
          expect(account).not.to.have.property('ses');
          expect(account.expertData).to.deep.equal(expertData);
          done();
        }).catch(done);
      });
    });

    context('when vat is provided', () => {
      it('should update the user and resolve the account', done => {
        UpdateUserAccountService.updateAccount(user.id, {vat}).then(account => {
          expect(User.update).to.have.been.calledWithExactly({vat}, user.id);
          expect(account).not.to.have.property('ses');
          expect(account.vat).to.deep.equal(vat);
          done();
        }).catch(done);
      });
    });
  });
});
