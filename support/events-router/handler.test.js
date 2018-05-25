import chai from 'chai';
import sinon from 'sinon';
import * as handler from './handler';
import Api from './src/Api';

const expect = chai.expect;

describe('handler', () => {
  describe('routeEvents', () => {
    before(() => sinon.stub(Api, 'routeEvents').resolves(true));
    after(() => Api.routeEvents.restore());

    it('forwards the event to Api.routeEvents', (done) => {
      const event = { the: 'event' };
      handler.routeEvents(event, {}, (err, res) => {
        if (err) return done(err);
        expect(Api.routeEvents).to.have.been.calledWithExactly(event);
        done();
      });
    });
  });
});
