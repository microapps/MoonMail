import { expect } from 'chai';
import Event from './Event';

describe('Event', () => {
  const buildKinesisEvent = (evt) => {
    return {
      kinesis: { data: new Buffer(JSON.stringify(evt)).toString('base64') },
      eventID: 'shardId-000:12345'
    };
  };
  const validEvent = { type: 'event.type', payload: { the: 'data' } };
  const invalidEvent = { payload: { the: 'data' } };

  describe('.deserializeKinesisEvent', () => {
    it('returns the Kinesis event payload', () => {
      const payload = { the: 'event' };
      const kinesisEvent = buildKinesisEvent(payload);
      const actual = Event.deserializeKinesisEvent(kinesisEvent);
      expect(actual).to.deep.equal(payload);
    });

    context('when the event is not JSON', () => {
      it('returns an empty object', () => {
        const malformedEvent = { kinesis: { data: 'boom!' } };
        const actual = Event.deserializeKinesisEvent(malformedEvent);
        expect(actual).to.deep.equal({});
      });
    });
  });

  describe('.isValid', () => {
    it('checks the event validity', () => {
      const suite = [
        { input: validEvent, output: true },
        { input: invalidEvent, output: false }
      ];
      suite.forEach((testCase) => {
        const actual = Event.isValid(testCase.input);
        expect(actual).to.equal(testCase.output);
      });
    });
  });
});
