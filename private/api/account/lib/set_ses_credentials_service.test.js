import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import { SetSesCredentialsService } from './set_ses_credentials_service';
import { SesCredentialsValidator } from './ses_credentials_validator';
import { SandboxMode } from '../../../lib/errors';
import { User } from '../../../lib/models/user';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('SetSesCredentialsService', () => {
  describe('.run()', () => {
    const wrongCredentials = {apiKey: 'wrong'};
    const sandboxCredentials = {apiKey: 'sandbox'};
    const validCredentials = {apiKey: 'right'};
    const userId = 'user-id';
    const userWithPlan = {id: userId, plan: 'iHaveAPlan'};
    const userWithNoPlan = {id: userId};
    const quota = {Max24HourSend: 100000};

    before(() => {
      sinon.stub(SesCredentialsValidator, 'isValid')
        .withArgs(wrongCredentials).rejects(new Error('Invalid AWS credentials'))
        .withArgs(sandboxCredentials).rejects(new SandboxMode('Invalid AWS endpoint'))
        .withArgs(validCredentials).resolves(quota);
    });

    context('when the credentials are wrong', () => {
      it('should reject the promise', done => {
        const promise = SetSesCredentialsService.run(userId, wrongCredentials);
        expect(promise).to.be.rejectedWith(Error, 'Invalid AWS credentials').notify(done);
      });
    });

    context('when the SES account is in sandbox mode', () => {
      it('should reject the promise', done => {
        const promise = SetSesCredentialsService.run(userId, sandboxCredentials);
        expect(promise).to.be.rejectedWith(SandboxMode).notify(done);
      });
    });

    context('when the credentials are valid', () => {
      const expectedSesParams = Object.assign({}, validCredentials, {sendingQuota: quota.Max24HourSend});
      beforeEach(() => sinon.stub(User, 'update').resolves(true));

      context('and the user has plan', () => {
        before(() => sinon.stub(User, 'get').resolves(userWithPlan));

        it('should assign them to the given user', done => {
          SetSesCredentialsService.run(userId, validCredentials).then(() => {
            const expectedParams = {ses: expectedSesParams};
            expect(User.update).to.have.been.calledWith(expectedParams, userId);
            done();
          }).catch(done);
        });

        afterEach(() => User.get.restore());
      });

      context('and the user plan is empty', () => {
        before(() => sinon.stub(User, 'get').resolves(userWithNoPlan));

        it('should set the plan', done => {
          SetSesCredentialsService.run(userId, validCredentials).then(() => {
            const expectedParams = {ses: expectedSesParams, plan: 'free_ses'};
            expect(User.update).to.have.been.calledWith(expectedParams, userId);
            done();
          }).catch(done);
        });

        afterEach(() => User.get.restore());
      });

      afterEach(() => User.update.restore());
    });

    after(() => SesCredentialsValidator.isValid.restore());
  });
});
