import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import { NotificationsBus } from './notifications_bus';

const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

const topicArns = {
  emailAdmins: 'email-admins-topic'
};

describe('NotificationsBus', () => {
  let busClient;

  before(() => {
    awsMock.mock('SNS', 'publish', {});
    busClient = new AWS.SNS();
  });

  describe('.publish ', () => {
    const topic = 'some-topic';
    const topicArn = 'some-topic-arn';
    const topicMapping = {};
    const message = {some: 'message'};
    const subject = 'some subject';
    let topicMappingStub;
    let busClientStub;

    before(() => {
      topicMappingStub = sinon.stub(NotificationsBus, '_topicsArnMapping', { get: () => topicMapping});
      busClientStub = sinon.stub(NotificationsBus, '_busClient', { get: () => busClient});
    });

    it('should call the bus client with correct params', done => {
      topicMapping[topic] = topicArn;
      const expectedParams = {
        TopicArn: topicArn,
        Message: JSON.stringify(message),
        Subject: subject
      };
      NotificationsBus.publish(topic, message, subject).then(() => {
        expect(busClient.publish).to.have.been.calledWith(expectedParams);
        done();
      });
    });

    it('should return the message', done => {
      const promise = NotificationsBus.publish(topic, message, subject);
      expect(promise).to.eventually.deep.equal(message).notify(done);
    });

    after(() => {
      topicMappingStub.restore();
      busClientStub.restore();
    });
  });

  after(() => awsMock.restore('SNS'));
});
