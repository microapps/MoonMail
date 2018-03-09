import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import chaiAsPromised from 'chai-as-promised';
import chaiThings from 'chai-things';
import sinonChai from 'sinon-chai';
import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import { EmailQueue } from './email_queue';
import { EnqueuedEmail } from './enqueued_email';
import { SendEmailService } from './send_email_service';
import * as sqsMessages from './sqs_receive_messages_response.json';
import * as sqsMessagesWithRiskScoreRcpts from './sqs_messages_with_risk_score_recipients';

const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.use(chaiThings);

describe('SendEmailService', () => {
  let sqsClient;
  let email;
  let queue;
  const lambdaContext = {
    functionName: 'lambda-function-name',
    getRemainingTimeInMillis: () => { }
  };
  let contextStub;
  let lambdaClient;

  before(() => {
    awsMock.mock('SQS', 'receiveMessage', sqsMessages);
    awsMock.mock('SQS', 'deleteMessage', { ResponseMetadata: { RequestId: 'e21774f2-6974-5d8b-adb2-3ba82afacdfc' } });
    sqsClient = new AWS.SQS();
    queue = new EmailQueue(sqsClient, { url: 'https://some_url.com' });
    contextStub = sinon.stub(lambdaContext, 'getRemainingTimeInMillis').returns(100000);
    awsMock.mock('Lambda', 'invoke', 'ok');
    lambdaClient = new AWS.Lambda();
  });

  after(() => {
    awsMock.restore('SQS');
    awsMock.restore('Lambda');
    contextStub.restore();
  });

  describe('#sendBatch()', () => {
    context('when there are messages in the queue', () => {
      let senderService;
      const emailHandles = sqsMessages.Messages.map((message) => {
        return { ReceiptHandle: message.ReceiptHandle, Id: message.MessageId };
      });

      before(() => {
        senderService = new SendEmailService(queue, null, contextStub);
        sinon.stub(senderService, 'updateUserData').returns(true);
        awsMock.mock('SES', 'sendRawEmail', { MessageId: 'some_message_id' });
      });

      it('returns the sent emails message handles', (done) => {
        expect(senderService.sendBatch()).to.eventually.deep.have.members(emailHandles).notify(done);
      });

      it('delivers all the emails', (done) => {
        sinon.spy(senderService, 'deliver');
        senderService.sendBatch().then(() => {
          expect(senderService.deliver.callCount).to.equal(emailHandles.length);
          senderService.deliver.restore();
          done();
        });
      });

      context('when the sending rate is exceeded', () => {
        before(() => {
          sinon.stub(senderService, 'deliver').rejects({ code: 'Throttling', message: 'Maximum sending rate exceeded' });
        });

        it('should leave the message in the queue', (done) => {
          senderService.sendBatch().then((sentEmails) => {
            expect(sentEmails.length).to.equal(0);
            done();
          });
        });

        after(() => senderService.deliver.restore());
      });

      context('when the message is rejected', () => {
        before(() => {
          const deliverStub = sinon.stub(senderService, 'deliver');
          deliverStub
            .onFirstCall().resolves({ MessageId: 'some_message_id' })
            .onSecondCall().rejects({ code: 'MessageRejected' });
        });

        it('should stop the execution', (done) => {
          senderService.sendBatch().catch((err) => {
            expect(err).to.deep.equal({ code: 'MessageRejected' });
            done();
          });
        });

        after(() => senderService.deliver.restore());
      });

      context('when the daily quota is exceeded', () => {
        before(() => {
          sinon.stub(senderService, 'deliver')
            .onFirstCall().resolves({ MessageId: 'some_message_id' })
            .onSecondCall().rejects({ code: 'Throttling', message: 'Daily message quota exceeded' });
        });

        it('should stop the execution', done => {
          senderService.sendBatch().catch(err => {
            expect(err).to.have.property('code', 'Throttling');
            done();
          });
        });

        after(() => senderService.deliver.restore());
      });

      context('when an unexpected error occurs', () => {
        before(() => {
          sinon.stub(senderService, 'deliver').rejects({ code: 'SomethingUnexpected' });
        });

        it('should delete the message from the queue', done => {
          senderService.sendBatch().then(emailsToDelete => {
            expect(emailsToDelete.length).to.equal(5);
            done();
          });
        });

        after(() => senderService.deliver.restore());
      });

      after(() => {
        awsMock.restore('SES');
      });
    });
  });

  describe('#sendNextBatch()', () => {
    context('when there is time for a new batch', () => {
      it('gets a new batch and delivers it', (done) => {
        const senderService = new SendEmailService(queue, lambdaClient, contextStub);
        done();
      });
    });
  });

  describe('#deliver()', () => {
    context('when recipient is not risky', () => {
      before(() => {
        awsMock.mock('SES', 'sendRawEmail', { MessageId: 'some_message_id' });
        const sqsMessage = sqsMessages.Messages[0];
        email = new EnqueuedEmail(JSON.parse(sqsMessage.Body), sqsMessage.ReceiptHandle);
        sinon.stub(email, 'toSesRawParams').resolves('test data');
      });

      it('sends the email', (done) => {
        const senderService = new SendEmailService(queue, null, contextStub);
        const emailClient = senderService.setEmailClient(email);
        senderService.deliver(email).then(res => {
          expect(emailClient.sendRawEmail).to.have.been.calledOnce;
          expect(emailClient.sendRawEmail).to.have.been.calledWith('test data');
          done();
        }).catch(done);
      });

      after(() => {
        awsMock.restore('SES');
      });
    });
    context('when recipient is risky', () => {
      before(() => {
        awsMock.mock('SES', 'sendRawEmail', { MessageId: 'some_message_id' });
        const sqsMessage = sqsMessagesWithRiskScoreRcpts.Messages[3]; // riskScore=1
        email = new EnqueuedEmail(JSON.parse(sqsMessage.Body), sqsMessage.ReceiptHandle);
      });

      it('does not send the email', (done) => {
        const senderService = new SendEmailService(queue, null, contextStub);
        const emailClient = senderService.setEmailClient(email);
        senderService.deliver(email).then(res => {
          expect(emailClient.sendRawEmail).not.to.have.been.called;
          expect(res.status).to.equals('BounceDetected');
          done();
        }).catch(done);
      });

      after(() => {
        awsMock.restore('SES');
      });
    });

    context('when recipient has riskScore but is not risky', () => {
      before(() => {
        awsMock.mock('SES', 'sendRawEmail', { MessageId: 'some_message_id' });
        const sqsMessage = sqsMessagesWithRiskScoreRcpts.Messages[1]; // riskScore=0
        email = new EnqueuedEmail(JSON.parse(sqsMessage.Body), sqsMessage.ReceiptHandle);
      });

      it('does not send the email', (done) => {
        const senderService = new SendEmailService(queue, null, contextStub);
        const emailClient = senderService.setEmailClient(email);
        senderService.deliver(email).then(res => {
          expect(emailClient.sendRawEmail).to.have.been.calledOnce;
          done();
        }).catch(done);
      });

      after(() => {
        awsMock.restore('SES');
      });
    });
  });

  describe('#_checkReputation()', () => {
    context('it is time to check reputation', () => {
      let senderService;

      context('the user has good reputation', () => {
        before(() => {
          senderService = new SendEmailService(queue, null, contextStub, { sentEmails: 2020, lastReputationCheckedOn: 0 });
          const userData = { reputationData: { reputation: 43.17, minimumAllowedReputation: 15 } };
          sinon.stub(senderService, '_invokeGetUserData').resolves({ Payload: JSON.stringify(userData) });
        });

        it('resolves to continue the execution', (done) => {
          senderService._checkReputation().then(() => {
            expect(senderService._invokeGetUserData).to.have.been.called;
            expect(senderService.lastReputationCheckedOn).to.equal(2020);
            expect(senderService.reputation).to.equal(43.17);
            done();
          }).catch(error => done(error));
        });

        after(() => {
          senderService._invokeGetUserData.restore();
        });
      });

      context('the user has bad reputation', () => {
        before(() => {
          senderService = new SendEmailService(queue, null, contextStub, { sentEmails: 2020, lastReputationCheckedOn: 0 });
          const userData = { reputationData: { reputation: 14, minimumAllowedReputation: 15 } };
          sinon.stub(senderService, '_invokeGetUserData').resolves({ Payload: JSON.stringify(userData) });
          sinon.stub(senderService.queue, 'purgeQueue').resolves({});
        });

        it('rejects to stop the execution', (done) => {
          senderService._checkReputation().catch((error) => {
            expect(senderService._invokeGetUserData).to.have.been.called;
            // expect(senderService.queue.purgeQueue).to.have.been.called;
            expect(senderService.lastReputationCheckedOn).to.equal(2020);
            expect(senderService.reputation).to.equal(14);
            expect(error).to.equal('Bad reputation');
            done();
          });
        });

        after(() => {
          senderService._invokeGetUserData.restore();
          senderService.queue.purgeQueue.restore();
        });
      });

      context('an error ocurred calling to the getUserDataFunction', () => {
        before(() => {
          senderService = new SendEmailService(queue, null, contextStub, { sentEmails: 2020, lastReputationCheckedOn: 0 });
          sinon.stub(senderService, '_invokeGetUserData').rejects('Unknown error');
        });

        it('resolves since an unknown error on reputation checking should not stop the execution', (done) => {
          senderService._checkReputation().then(() => {
            expect(senderService._invokeGetUserData).to.have.been.called;
            expect(senderService.lastReputationCheckedOn).to.equal(2020);
            done();
          });
        });

        after(() => {
          senderService._invokeGetUserData.restore();
        });
      });

    });

    context('no need to check reputation', () => {
      let senderService;

      beforeEach(() => {
        senderService = new SendEmailService(queue, null, contextStub, { sentEmails: 2020, lastReputationCheckedOn: 2000 });
        sinon.stub(senderService, '_invokeGetUserData').resolves({});
      });


      it('resolves to continue the execution without checking reputation', (done) => {
        senderService._checkReputation().then(() => {
          expect(senderService._invokeGetUserData).to.have.not.been.called;
          expect(senderService.lastReputationCheckedOn).to.equal(2000);
          done();
        }).catch(error => done(error));
      });

      after(() => {
        senderService._invokeGetUserData.restore();
      });
    });

  });
});
