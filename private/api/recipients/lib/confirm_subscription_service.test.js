import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { ConfirmSubscriptionService } from './confirm_subscription_service';
import { Recipient } from 'moonmail-models';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('ConfirmSubscriptionService', () => {
  describe('#subscribe()', () => {
    context('when the recipient doesn\'t exist', () => {
      const service = new ConfirmSubscriptionService('listId', 'recipientId', 'verificationCode');
      before(() => sinon.stub(Recipient, 'get').resolves({}));
      it('should reject the promise', done => {
        expect(service.subscribe()).to.be.rejected.notify(done);
      });
      after(() => Recipient.get.restore());
    });

    context('when the recipient exist', () => {
      const listId = 'some-list-id';
      const recipient = {
        status: Recipient.statuses.awaitingConfirmation,
        id: 'some-id', verificationCode: 'some-code', listId
      };
      beforeEach(() => {
        sinon.stub(Recipient, 'update').resolves({});
        sinon.stub(Recipient, 'get').resolves(recipient);
      });
      context('and matches the verification code', () => {
        const service = new ConfirmSubscriptionService(listId, recipient.id, recipient.verificationCode);
        it('should change the recipient status', done => {
          service.subscribe().then(() => {
            const expectedParams = {status: Recipient.statuses.subscribed};
            expect(Recipient.update).to.have.been.calledWith(expectedParams, listId, recipient.id);
            done();
          }).catch(done);
        });
      });

      context('and doesn\'t match the verification code', () => {
        const service = new ConfirmSubscriptionService(listId, recipient.id, 'wrong-verification-code');
        it('should reject the promise', done => {
          expect(service.subscribe()).to.be.rejected.notify(done);
        });
      });

      afterEach(() => {
        Recipient.update.restore();
        Recipient.get.restore();
      });
    });
  });
});
