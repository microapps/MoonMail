import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import * as sinonAsPromised from 'sinon-as-promised';
import { SenderDecoratorService } from '../lib/sender_decorator_service';
import { User } from '../../../../lib/models/user';


const expect = chai.expect;

describe('getSender', () => {
  let event;
  const senderId = 'sender-id';
  const sender = { id: senderId, emailAddress: 'email@example.com' };
  const user = { id: 'user-id', senders: [sender] };

  describe('#respond()', () => {
    before(() => sinon.stub(decrypt, 'default').resolves({ sub: 'user-id' }));

    context('when the event is valid', () => {
      before(() => {
        event = { senderId };
        sinon.stub(User, 'fetchSender').resolves(sender);
        sinon.stub(SenderDecoratorService, 'provideDomainDkimSpfStatuses').resolves({
          domainVerified: false,
          domainVerificationStatus: 'NotStarted',
          domainVerificationToken: 'U+OBpcjv35GlPa1Bi3gGyzmcqF8SRzem+rMAQ4s94Z0=',
          dkimEnabled: false,
          dkimVerificationStatus: 'NotStarted',
          dkimTokens: [],
          spfEnabled: true
        });
      });

      it('should return with success', (done) => {
        respond(event, (err, result) => {
          expect(err).to.not.exist;
          const expectedResponse = {
            id: 'sender-id',
            emailAddress: 'email@example.com',
            domainVerified: false,
            domainVerificationStatus: 'NotStarted',
            domainVerificationToken: 'U+OBpcjv35GlPa1Bi3gGyzmcqF8SRzem+rMAQ4s94Z0=',
            dkimEnabled: false,
            dkimVerificationStatus: 'NotStarted',
            dkimTokens: [],
            spfEnabled: true
          };
          // Pending
          // expect(result).to.deep.equal(expectedResponse);
          done();
        });
      });

      after(() => {
        SenderDecoratorService.provideDomainDkimSpfStatuses.restore();
        User.fetchSender.restore();
      });
    });

    context('when the event is not valid', () => {
      it('returns an error message', (done) => {
        respond({ senderId: null }, (err, result) => {
          expect(result).to.not.exist;
          expect(JSON.parse(err).message).to.equal('No sender specified');
          done();
        });
      });
    });

    after(() => decrypt.default.restore());
  });
});
