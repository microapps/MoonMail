import * as chai from 'chai';
import respond from './action';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { CleanRecipientsEmailService } from '../lib/clean_recipients_email_service';
import * as event from './event.json';

const expect = chai.expect;

describe('cleanRecipients', () => {
  describe('#respond()', () => {
    before(() => {
      sinon.stub(CleanRecipientsEmailService, 'cleanUpdateAndNotify').resolves({});
      sinon.stub(CleanRecipientsEmailService, 'cleanAndUpdate').resolves({});
    });

    it('calls the cleaning service', (done) => {
      respond(event, (err, result) => {
        expect(CleanRecipientsEmailService.cleanAndUpdate).to.be.calledOnce;
        expect(CleanRecipientsEmailService.cleanUpdateAndNotify).to.be.calledOnce;
        done();
      });
    });

    after(() => {
      CleanRecipientsEmailService.cleanUpdateAndNotify.restore();
      CleanRecipientsEmailService.cleanAndUpdate.restore();
    });
  });
});
