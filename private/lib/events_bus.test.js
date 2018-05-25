import chai from 'chai';
import sinon from 'sinon';
import AWS from 'aws-sdk-mock';
import EventsBus from './events_bus';

const expect = chai.expect;

describe('EventsBus', () => {
  describe('.publish', () => {
    const topicArn = 'the-arn';

    beforeEach(() => {
      process.env.EVENTS_BUS_TOPIC_ARN = topicArn;
    });
    afterEach(() => {
      AWS.restore('SNS');
      delete process.env.EVENTS_BUS_TOPIC_ARN;
    });

    it('should send an SNS message to the right topic', async () => {
      const payload = {the: 'event'};
      const eventType = 'the.type';
      const event = {
        type: eventType,
        payload
      };
      const snsResult = {the: 'result'};
      const expectedParams = {
        Message: JSON.stringify(event),
        TopicArn: topicArn
      };
      AWS.mock('SNS', 'publish', (params, callback) => {
        expect(params).to.deep.equal(expectedParams);
        callback(null, snsResult);
      });
      const result = await EventsBus.publish(eventType, payload);
      expect(result).to.deep.equal(snsResult);
    });
  });
});
