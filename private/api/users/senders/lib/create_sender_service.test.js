

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { CreateSenderService } from './create_sender_service';
import { EmailVerifierService } from './email_verifier_service';
import { User } from '../../../../lib/models/user';

const expect = chai.expect;
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('CreateSenderService', () => {
  const existingEmail = 'david.garcia@microapps.com';
  const newEmail = 'some@email.com';
  const userId = 'userId';
  const senderId = 'senderId';
  const sender = { id: senderId, emailAddress: existingEmail, verified: true };
  let service;

  describe('#createSender()', () => {
    context('when the sender doesn\'t exist', () => {
      const newSender = {
        id: 'new-sender-id',
        emailAddress: newEmail,
        verified: false
      };
      const verifierService = sinon.createStubInstance(EmailVerifierService);
      let serviceGetter;

      before(() => {
        sinon.stub(User, 'createSender').resolves(newSender);
        service = new CreateSenderService(newEmail, userId);
        serviceGetter = sinon.stub(service, 'verifierService', { get: () => verifierService });
      });

      it('creates the sender', (done) => {
        service.createSender().then(() => {
          const [userIdArg, senderArg] = User.createSender.lastCall.args;
          expect(userIdArg).to.equal(userId);
          expect(senderArg).to.equal(newEmail);
          done();
        });
      });

      it('verifies the sender', (done) => {
        verifierService.verify.reset();
        service.createSender().then(() => {
          expect(verifierService.verify).to.have.been.calledOnce;
          done();
        })
          .catch(err => done(err));
      });

      it('enables notifications', (done) => {
        verifierService.enableNotifications.reset();
        service.createSender().then(() => {
          expect(verifierService.enableNotifications).to.have.been.calledOnce;
          done();
        })
          .catch(err => done(err));
      });

      it('enables headers in notifications', (done) => {
        verifierService.enableNotificationHeaders.reset();
        service.createSender().then(() => {
          expect(verifierService.enableNotificationHeaders).to.have.been.calledOnce;
          done();
        })
          .catch(err => done(err));
      });

      after(() => {
        User.createSender.restore();
        serviceGetter.restore();
      });
    });

    context('when the sender already exists', () => {
      const senderError = new Error('Sender error');
      before(() => {
        service = new CreateSenderService(newEmail, userId);
        sinon.stub(User, 'createSender').rejects(senderError);
      });

      it('rejects the promise', (done) => {
        expect(service.createSender()).to.be.rejectedWith(senderError).notify(done);
      });

      after(() => User.createSender.restore());
    });
  });
});
