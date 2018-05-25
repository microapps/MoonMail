import * as chai from 'chai';
import respond from './action';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import Senders from '../../../lib/senders/index';
import * as event from './event.json';

const expect = chai.expect;

describe('attachSender', () => {
  describe('#respond()', () => {
    beforeEach(() => {
      sinon.stub(Senders, 'attachSender').resolves({});
    });

    it('attaches senders', (done) => {
      respond(event, (err, result) => {
        expect(Senders.attachSender).to.have.been.called.once;
        done();
      });
    });

    afterEach(() => {
      Senders.attachSender.restore();
    });
  });
});
