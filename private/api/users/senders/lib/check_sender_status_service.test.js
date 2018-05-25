'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { CheckSenderStatusService } from './check_sender_status_service';
import { EmailVerifierService } from './email_verifier_service';
import { User } from '../../../../lib/models/user';
import { NonExistingSender } from '../../../../lib/errors';

const expect = chai.expect;
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('CheckSenderStatusService', () => {
  const existingEmail = 'david.garcia@microapps.com';
  const userId = 'userId';
  const senderId = 'senderId';
  const verifiedSender = {id: senderId, emailAddress: existingEmail, verified: true};
  const nonVerifiedSender = {id: senderId, emailAddress: existingEmail, verified: false};
  const verifierServiceStub = sinon.createStubInstance(EmailVerifierService);
  sinon.stub(EmailVerifierService, 'create').returns(verifierServiceStub);
  const service = new CheckSenderStatusService(userId, senderId);

  describe('#checkSender()', () => {
    context('when the sender exists', () => {
      context('when the sender is verified', () => {
        beforeEach(() => sinon.stub(User, 'fetchSender').resolves(verifiedSender));

        it('should should return the sender item', done => {
          expect(service.checkSender()).to.eventually.deep.equal(verifiedSender).notify(done);
        });

        afterEach(() => User.fetchSender.restore());
      });

      context('and it\'s not verified', () => {
        before(() => sinon.stub(User, 'fetchSender').resolves(nonVerifiedSender));

        context('when the sender is verified in AWS', () => {
          beforeEach(() => {
            verifierServiceStub.isVerified.reset();
            verifierServiceStub.isVerified.resolves(true);
            sinon.stub(User, 'updateSender').resolves(verifiedSender);
          });

          it('should update the sender', done => {
            service.checkSender().then(() => {
              expect(User.updateSender).to.have.been.calledOnce;
              expect(verifierServiceStub.isVerified).to.have.been.calledOnce;
              const updateParams = User.updateSender.lastCall.args[1];
              expect(updateParams).to.include(verifiedSender);
              done();
            });
          });

          it('should return the updated sender', done => {
            expect(service.checkSender()).to.eventually.deep.equal(verifiedSender).notify(done);
          });

          afterEach(() => User.updateSender.restore());
        });

        context('when the sender is not verified in AWS', () => {
          beforeEach(() => {
            verifierServiceStub.isVerified.reset();
            verifierServiceStub.isVerified.resolves(false);
            sinon.stub(User, 'updateSender').resolves(nonVerifiedSender);
          });

          it('should return the sender', done => {
            service.checkSender().then(result => {
              expect(verifierServiceStub.isVerified).to.have.been.calledOnce;
              expect(result).to.deep.equal(nonVerifiedSender);
              expect(User.updateSender).not.to.have.been.called;
              done();
            });
          });

          afterEach(() => User.updateSender.restore());
        });

        after(() => User.fetchSender.restore());
      });
    });

    context('when the sender doesn\'t exist', () => {
      const senderError = new NonExistingSender('Sender does not exist');
      before(() => sinon.stub(User, 'fetchSender').rejects(senderError));

      it('rejects the promise', done => {
        expect(service.checkSender()).to.be.rejectedWith(senderError).notify(done);
      });

      after(() => User.fetchSender.restore());
    });
  });
});
