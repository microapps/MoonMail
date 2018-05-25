import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import awsMock from 'aws-sdk-mock';
import { SES } from 'aws-sdk';
import { Recipient, List } from 'moonmail-models';
import chaiAsPromised from 'chai-as-promised';
import 'sinon-as-promised';
import base64url from 'base64-url';
import { ListSubscribeService } from './list_subscribe_service';
import { RecipientAlreadyExists } from '../../../lib/errors';
import Senders from '../../../lib/senders/index';
import EventsBus from '../../../lib/events_bus';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('ListSubscribeService', () => {
  const userId = 'user-id';
  const listId = 'list-id';
  const email = 'david.garcia@microapps.com';
  const recipientId = base64url.encode(email);
  const existingRecipient = {
    email,
    name: 'David',
    surname: 'Garcia'
  };
  const nonExistingEmail = 'fake@email.com';
  const nonexistingRecipient = { email: nonExistingEmail };
  const subscriptionOrigin = Recipient.subscriptionOrigins.signupForm;

  describe('.subscribe', () => {
    const list = { id: listId };
    context('when the recipient already exists', () => {
      before(() => sinon.stub(Recipient, 'get').withArgs(listId, recipientId).resolves(existingRecipient));

      it('should return an error', (done) => {
        const promise = ListSubscribeService.subscribe(list, existingRecipient);
        expect(promise).to.be.rejectedWith(RecipientAlreadyExists).notify(done);
      });

      after(() => Recipient.get.restore());
    });

    context('when the recipient does not exist', () => {
      const verificationCode = 'some-verification-code';
      const expectedRecipientParams = Object.assign({},
        { listId, subscriptionOrigin, verificationCode, id: base64url.encode(nonExistingEmail), status: Recipient.statuses.awaitingConfirmation },
        nonexistingRecipient);

      beforeEach(() => {
        sinon.stub(Recipient, 'get').withArgs(listId, base64url.encode(nonExistingEmail)).resolves({});
        sinon.stub(Recipient, 'save').withArgs(expectedRecipientParams).resolves(expectedRecipientParams);
        sinon.stub(List, 'get').resolves({ sendEmailVerificationOnSubscribe: true });
        sinon.stub(ListSubscribeService, '_sendVerificationEmailIfApplies').resolves({});
        sinon.stub(ListSubscribeService, '_generateVerificationCode').returns(verificationCode);
      });
      afterEach(() => {
        Recipient.get.restore();
        Recipient.save.restore();
        List.get.restore();
        ListSubscribeService._sendVerificationEmailIfApplies.restore();
        ListSubscribeService._generateVerificationCode.restore();
      });

      it('should create it with confirmation token', (done) => {
        ListSubscribeService.subscribe(list, nonexistingRecipient).then((res) => {
          expect(Recipient.save).to.have.been.calledWith(expectedRecipientParams);
          done();
        }).catch(done);
      });

      it('should send the verification email', (done) => {
        ListSubscribeService._sendVerificationEmailIfApplies.reset();
        ListSubscribeService.subscribe(list, nonexistingRecipient).then((res) => {
          expect(ListSubscribeService._sendVerificationEmailIfApplies).to.have.been.calledOnce;
          done();
        }).catch(done);
      });
    });
  });

  describe('._doCreate', () => {
    context('when the list sendEmailVerificationOnSubscribe is disabled', () => {
      const senderId = '123';
      const list = { id: listId, senderId, name: 'my list', sendEmailVerificationOnSubscribe: false };
      const recipient = { listId, email: 'some@email.com' };

      before(() => {
        sinon.stub(List, 'get').resolves(list);
        sinon.stub(Recipient, 'save').resolves({});
      });
      after(() => {
        Recipient.save.restore();
        List.get.restore();
      });

      it('saves the recipient as subscribed', (done) => {
        ListSubscribeService._doCreate(list, recipient, userId).then((result) => {
          expect(Recipient.save.lastCall.args[0].status).to.equal('subscribed');
          expect(Recipient.save.lastCall.args[0].subscriptionOrigin).to.equal(Recipient.subscriptionOrigins.signupForm);
          done();
        }).catch(done);
      });
    });

    context('when the list sendEmailVerificationOnSubscribe is enabled', () => {
      const senderId = '123';
      const list = { id: listId, senderId, name: 'my list' };
      const recipient = { listId, email: 'some@email.com' };

      before(() => {
        sinon.stub(List, 'get').resolves(list);
        sinon.stub(Recipient, 'save').resolves({});
      });
      after(() => {
        Recipient.save.restore();
        List.get.restore();
      });

      it('saves the recipient as pending for confirmation', (done) => {
        ListSubscribeService._doCreate(list, recipient, userId).then((result) => {
          expect(Recipient.save.lastCall.args[0].status).to.equal('awaitingConfirmation');
          expect(Recipient.save.lastCall.args[0].subscriptionOrigin).to.equal(Recipient.subscriptionOrigins.signupForm);
          done();
        }).catch(done);
      });
    });
  });

  describe('._sendVerificationEmailIfApplies', () => {
    let sesStub;
    let buildSesStub;

    before(() => {
      sinon.stub(EventsBus, 'publish').resolves(true);
      awsMock.mock('SES', 'sendEmail', {});
      sesStub = new SES();
      buildSesStub = sinon.stub(ListSubscribeService, '_buildSesClient').returns(sesStub);
    });
    after(() => {
      ListSubscribeService._buildSesClient.restore();
      buildSesStub.restore();
      awsMock.restore('SES');
      EventsBus.publish.restore();
    });

    context('when the list has a custom confirmation template', () => {
      const senderId = '123';
      const customBodyList = { id: listId, confirmationEmailBody: 'some email html', name: 'my list' };
      const sender = { id: senderId, apiKey: 'api-key', apiSecret: 'api-secret', region: 'us-east-1', emailAddress: 'my-email@test.com' };
      before(() => sinon.stub(Senders, 'fetchSender').resolves(sender));
      after(() => Senders.fetchSender.restore());
      it('should use the custom body', (done) => {
        const recipient = { listId, verificationCode: '1234', id: base64url.encode(nonExistingEmail), email: nonExistingEmail, status: 'awaitingConfirmation' };
        ListSubscribeService._sendVerificationEmailIfApplies(customBodyList, recipient, userId).then((result) => {
          const sendEmailArgs = sesStub.sendEmail.lastCall.args[0];
          expect(sendEmailArgs.Message.Body.Html.Data).to.equal(customBodyList.confirmationEmailBody);
          done();
        }).catch(done);
      });
    });

    context('when the list has a custom sender', () => {
      const senderId = '123';
      const sender = { id: senderId, apiKey: 'api-key', apiSecret: 'api-secret', region: 'us-east-1', emailAddress: 'my-email@test.com' };
      const list = { id: listId, senderId, name: 'my list' };
      process.env.API_HOST = 'api.com';
      before(() => sinon.stub(Senders, 'fetchSender').resolves(sender));
      after(() => Senders.fetchSender.restore());

      it('should use the specified sender', (done) => {
        const recipient = { listId, verificationCode: '1234', id: base64url.encode(nonExistingEmail), email: nonExistingEmail, status: 'awaitingConfirmation' };
        ListSubscribeService._sendVerificationEmailIfApplies(list, recipient, userId).then((result) => {
          const expectedSesConfig = { accessKeyId: sender.apiKey, secretAccessKey: sender.apiSecret, region: sender.region };
          expect(ListSubscribeService._buildSesClient).to.have.been.calledWith(expectedSesConfig);
          const sendEmailArgs = sesStub.sendEmail.lastCall.args[0];
          expect(sendEmailArgs).to.have.deep.property('Destination.ToAddresses[0]', recipient.email);
          expect(sendEmailArgs).to.have.property('Source', sender.emailAddress);
          const encodedUserId = base64url.encode(userId);
          const subscribeUrl = `https://${process.env.API_HOST}/lists/${listId}/recipients/${recipient.id}/verify?v=${recipient.verificationCode}&u=${encodedUserId}`;
          expect(sendEmailArgs.Message.Body.Html.Data).to.contain(subscribeUrl);
          done();
        }).catch(done);
      });
    });

    context('when the list has not a custom sender', () => {
      const senderDefaults = {
        defaults: {
          emailAddress: 'no-reply@microapps.com',
          region: 'us-east-1',
          apiKey: 'key',
          apiSecret: 'secret'
        }
      };
      it('should use the default sender', (done) => {
        process.env.API_HOST = 'myhost.com';
        process.env.FREE_SENDERS_CONFIG = JSON.stringify(senderDefaults);
        const sender = senderDefaults.defaults;
        const recipient = { listId, verificationCode: '1234', id: base64url.encode(nonExistingEmail), email: nonExistingEmail, status: 'awaitingConfirmation' };
        ListSubscribeService._sendVerificationEmailIfApplies({ id: listId, name: 'another' }, recipient, userId).then((result) => {
          const expectedSesConfig = { accessKeyId: sender.apiKey, secretAccessKey: sender.apiSecret, region: sender.region };
          expect(ListSubscribeService._buildSesClient).to.have.been.calledWith(expectedSesConfig);
          const sendEmailArgs = sesStub.sendEmail.lastCall.args[0];
          expect(sendEmailArgs).to.have.deep.property('Destination.ToAddresses[0]', recipient.email);
          expect(sendEmailArgs).to.have.property('Source', sender.emailAddress);
          const encodedUserId = base64url.encode(userId);
          const subscribeUrl = `https://${process.env.API_HOST}/lists/${listId}/recipients/${recipient.id}/verify?v=${recipient.verificationCode}&u=${encodedUserId}`;
          expect(sendEmailArgs.Message.Body.Html.Data).to.contain(subscribeUrl);
          done();
        }).catch(done);
      });
    });

    context('when the recipient created as subscribed', () => {
      const senderId = '123';
      const sender = { id: senderId, apiKey: 'api-key', apiSecret: 'api-secret', region: 'us-east-1', emailAddress: 'my-email@test.com' };
      const list = { id: listId, senderId, name: 'my list' };
      const subscribedRecipient = { listId, status: 'subscribed' };

      before(() => {
        sinon.stub(Senders, 'fetchSender').resolves(sender);
        sinon.stub(ListSubscribeService, '_deliverVerificationEmail').resolves({});
      });
      after(() => {
        Senders.fetchSender.restore();
        ListSubscribeService._deliverVerificationEmail.restore();
      });

      it('skips delivering the email', (done) => {
        ListSubscribeService._sendVerificationEmailIfApplies(list, subscribedRecipient, userId).then((result) => {
          expect(ListSubscribeService._deliverVerificationEmail).to.have.been.not.called;
          done();
        }).catch(done);
      });

      it('should publish a notification to the bus', (done) => {
        ListSubscribeService._sendVerificationEmailIfApplies(list, subscribedRecipient, userId).then((result) => {
          const eventType = 'list.recipient.subscribe';
          const payload = { recipient: subscribedRecipient };
          expect(EventsBus.publish).to.have.been.calledWithExactly(eventType, payload);
          done();
        }).catch(done);
      });
    });
  });
});
