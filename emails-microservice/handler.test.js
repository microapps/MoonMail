import chai from 'chai';
import sinon from 'sinon';
import * as handler from './handler';
import Api from './src/Api';

const expect = chai.expect;

describe('handler', () => {
  describe('processSesNotification', () => {
    before(() => sinon.stub(Api, 'processSesNotification').resolves(true));
    after(() => Api.processSesNotification.restore());

    it('parses the SNS event and forwards it to Api.processSesNotification', (done) => {
      const event = { the: 'event' };
      const snsEvent = { Records: [{ Sns: { Message: JSON.stringify(event) } }] };
      handler.processSesNotification(snsEvent, {}, (err, res) => {
        if (err) return done(err);
        expect(Api.processSesNotification).to.have.been.calledWithExactly(event);
        done();
      });
    });
  });
});
