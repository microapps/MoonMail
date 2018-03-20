import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import Promse from 'bluebird';
import InternalEventsClient from './InternalEventsClient';

const { expect } = chai;
chai.use(sinonChai);

describe('InternalEventsClient', () => {
  describe('.publish', () => {
    let snsStub;
    const emailEventTopicArn = 'email-event-topic';

    beforeEach(() => {
      awsMock.mock('SNS', 'publish', {});
      snsStub = new AWS.SNS();
      process.env.EMAIL_EVENT_TOPIC_ARN = emailEventTopicArn;
    });
    afterEach(() => {
      awsMock.restore('SNS');
      delete process.env.EMAIL_EVENT_TOPIC_ARN;
    });

    it('should publish the event to the appropriate SNS topic', async () => {
      const event = {
        type: 'email.link.clicked',
        payload: { the: 'event ' }
      };
      await InternalEventsClient.publish({ event, client: snsStub });
      const expected = {
        Message: JSON.stringify(event),
        TopicArn: process.env.EMAIL_EVENT_TOPIC_ARN
      };
      expect(snsStub.publish).to.have.been.calledWith(expected);
    });

    it('should have topic mappings for all supported event types', async () => {
      const eventTopicMapping = [
        ['email.link.clicked', emailEventTopicArn],
        ['email.opened', emailEventTopicArn]
      ];
      await Promise.map(eventTopicMapping, ([type, topicArn]) => {
        const event = { type, payload: { the: 'payload' } };
        return InternalEventsClient.publish({ event, client: snsStub })
          .then(() =>
            expect(snsStub.publish).to
              .have.been.calledWithMatch(sinon.match({ TopicArn: topicArn })));
      });
    });
  });
});
