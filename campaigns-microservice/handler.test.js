import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import R from 'ramda';
import * as handler from './handler';
import Api from './src/Api';

chai.use(sinonChai);
const { expect } = chai;
const buildKinesisRecord = evt => ({
  kinesis: { data: new Buffer(JSON.stringify(evt)).toString('base64') },
  eventID: 'shardId-000:12345'
});

describe('handler', () => {
  describe('processEmailNotifications', () => {
    before(() => sinon.stub(Api, 'processEmailNotifications').resolves(true));
    after(() => Api.processEmailNotifications.restore());

    it('parses the Kinesis events and forwards them to Api.processEmailNotifications', (done) => {
      const events = [{ the: 'event' }, { another: 'event' }];
      const kinesisStream = { Records: R.map(buildKinesisRecord, events) };
      handler.processEmailNotifications(kinesisStream, {}, (err) => {
        if (err) return done(err);
        expect(Api.processEmailNotifications).to.have.been.calledWithExactly(events);
        return done();
      });
    });
  });
});
