import * as chai from 'chai';
import * as sinon from 'sinon';
const Bluebird = require('bluebird');
require('sinon-as-promised')(Bluebird);
import awsMock from 'aws-sdk-mock';
import { SES } from 'aws-sdk';
import { User } from '../../../../lib/models/user';
import { EmailVerifierService } from './email_verifier_service';

const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
chai.use(chaiAsPromised);

const verificationResponse = (email, status) => {
  const response = { VerificationAttributes: {} };
  response.VerificationAttributes[email] = { VerificationStatus: status };
  return response;
};

describe('EmailVerifierService', () => {
  const emailAddress = 'david.garcia@microapps.com';
  const userId = 'some-id';
  const ses = { apiKey: 'mykey', apiSecret: 'mySecret', region: 'us-east-1' };
  const user = { id: userId, ses };
  const service = new EmailVerifierService(emailAddress, { userId, user });


  describe('#_getSesClient', () => {
    beforeEach(() => service.sesClient = null);

    context('when the user has api keys', () => {
      before(() => sinon.stub(User, 'get').resolves(user));
      it('should create a ses client with the user credentials', done => {
        service._getSesClient().then(client => {
          const creds = {
            apiKey: client.config.accessKeyId,
            apiSecret: client.config.secretAccessKey,
            region: client.config.region
          };
          expect(creds).to.deep.equal(ses);
          done();
        });
      });
      after(() => User.get.restore());
    });

    context('when the user has no api keys', () => {
      before(() => sinon.stub(User, 'get').resolves({ id: userId }));
      it('rejects the promise', done => {
        const clientPromise = service._getSesClient();
        expect(clientPromise).to.eventually.be.rejectedWith('User has no Api Keys').notify(done);
      });
      after(() => User.get.restore());
    });
  });

  context('when the email is verified', () => {
    before(() => {
      awsMock.mock('SES', 'getIdentityVerificationAttributes', verificationResponse(emailAddress, 'Success'));
      sinon.stub(service, '_getSesClient').resolves(new SES());
    });

    describe('#isVerified', () => {
      it('should return true', done => {
        service.isVerified().then(result => {
          expect(result).to.be.truthy;
          done();
        })
          .catch(e => done(e));
      });
    });

    afterEach(() => {
      service._getSesClient.restore();
      awsMock.restore('SES');
    });
  });

  context('when the email is not verified', () => {
    beforeEach(() => {
      awsMock.mock('SES', 'getIdentityVerificationAttributes', {});
      sinon.stub(service, '_getSesClient').resolves(new SES());
    });

    describe('#isVerified', () => {
      it('should return false', done => {
        service.isVerified().then(result => {
          expect(result).to.be.falsey;
          done();
        })
          .catch(e => done(e));
      });
    });

    afterEach(() => {
      service._getSesClient.restore();
      awsMock.restore('SES');
    });
  });

  describe('#verify', () => {
    let sesClient;

    before(() => {
      awsMock.mock('SES', 'verifyEmailIdentity', {});
      sesClient = new SES();
      sinon.stub(service, '_getSesClient').resolves(sesClient);
    });

    it('should send a verification email', done => {
      service.verify().then(() => {
        const args = sesClient.verifyEmailIdentity.lastCall.args[0];
        expect(args).to.have.property('EmailAddress', emailAddress);
        done();
      })
        .catch(err => done(err));
    });

    afterEach(() => {
      service._getSesClient.restore();
      awsMock.restore('SES');
    });
  });

  describe('#enableNotificationHeaders', () => {
    let sesClient;

    before(() => {
      awsMock.mock('SES', 'setIdentityHeadersInNotificationsEnabled', {});
      sesClient = new SES();
      sinon.stub(service, '_getSesClient').resolves(sesClient);
    });

    after(() => {
      service._getSesClient.restore();
      awsMock.restore('SES');
    });

    it('should set the bounces and complaints notifications topic', done => {
      service.enableNotificationHeaders().then(() => {
        const notificationParams = type => ({ Identity: emailAddress, NotificationType: type, Enabled: true });
        const bouncesParams = notificationParams('Bounce');
        const complaintParams = notificationParams('Complaint');
        const deliveryParams = notificationParams('Delivery');
        expect(sesClient.setIdentityHeadersInNotificationsEnabled).to.have.been.calledThrice;
        expect(sesClient.setIdentityHeadersInNotificationsEnabled).to.have.been.calledWith(bouncesParams);
        expect(sesClient.setIdentityHeadersInNotificationsEnabled).to.have.been.calledWith(complaintParams);
        expect(sesClient.setIdentityHeadersInNotificationsEnabled).to.have.been.calledWith(deliveryParams);
        done();
      });
    });
  });

  describe('#enableNotifications', () => {
    const notificationsTopicArn = 'notifications-topic-arn:us-east-1:';
    const notificationsTopicArns = `${notificationsTopicArn},another-topic-arn:us-west-1:`;
    process.env.EMAIL_NOTIFICATIONS_TOPICS = notificationsTopicArns;
    const deliveriesTopicArn = 'deliveries-topic-arn:us-east-1:';
    const deliveriesTopicArns = `${deliveriesTopicArn},another-topic-arn:us-west-1:`;
    process.env.EMAIL_DELIVERIES_TOPICS = deliveriesTopicArns;
    let sesClient;

    before(() => {
      awsMock.mock('SES', 'setIdentityNotificationTopic', {});
      sesClient = new SES();
      sinon.stub(service, '_getSesClient').resolves(sesClient);
    });

    it('should set the bounces and complaints notifications topic', done => {
      service.enableNotifications().then(() => {
        const notificationParams = type => ({ Identity: emailAddress, NotificationType: type, SnsTopic: notificationsTopicArn });
        const bouncesParams = notificationParams('Bounce');
        const complaintParams = notificationParams('Complaint');
        const deliveryParams = { Identity: emailAddress, NotificationType: 'Delivery', SnsTopic: deliveriesTopicArn };
        expect(sesClient.setIdentityNotificationTopic).to.have.been.calledThrice;
        expect(sesClient.setIdentityNotificationTopic).to.have.been.calledWith(bouncesParams);
        expect(sesClient.setIdentityNotificationTopic).to.have.been.calledWith(complaintParams);
        expect(sesClient.setIdentityNotificationTopic).to.have.been.calledWith(deliveryParams);
        done();
      });
    });

    after(() => {
      service._getSesClient.restore();
      awsMock.restore('SES');
    });
  });
});
