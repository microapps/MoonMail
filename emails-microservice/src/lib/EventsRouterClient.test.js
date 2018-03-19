import chai from 'chai';
import sinonChai from 'sinon-chai';
import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import EventsRouterClient from './EventsRouterClient';

const { expect } = chai;
chai.use(sinonChai);

describe('EventsRouterClient', () => {
  describe('.write', () => {
    let kinesisStub;

    before(() => {
      awsMock.mock('Kinesis', 'putRecord', {});
      kinesisStub = new AWS.Kinesis();
      process.env.EVENTS_ROUTER_STREAM_NAME = 'kinesis-stream-name';
    });
    after(() => {
      awsMock.restore('Kinesis');
      delete process.env.EVENTS_ROUTER_STREAM_NAME;
    });

    it('should write the event to the Kinesis Stream', async () => {
      const payload = { my: 'payload' };
      const topic = 'the-topic';
      await EventsRouterClient.write({ topic, payload, client: kinesisStub });
      const expected = {
        Data: JSON.stringify(payload),
        PartitionKey: topic,
        StreamName: process.env.EVENTS_ROUTER_STREAM_NAME
      };
      expect(kinesisStub.putRecord).to.have.been.calledWith(expected);
    });
  });
});
