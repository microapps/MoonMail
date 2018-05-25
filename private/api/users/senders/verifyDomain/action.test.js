'use strict';

import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import * as sinonAsPromised from 'sinon-as-promised';
import { GenerateDomainVerificationTokensService } from '../lib/generate_domain_verification_tokens_service';

const expect = chai.expect;

describe('verifyDomain', () => {
  let event;
  const user = {id: 'user-id'};

  describe('#respond()', () => {
    before(() => sinon.stub(decrypt, 'default').resolves({ sub: 'user-id' }));

    context('when the event is valid', () => {
      before(() => {
        event = {senderId: 'sender-id'};
        sinon.stub(GenerateDomainVerificationTokensService, 'generate').resolves({VerificationToken: 'some-token'});
      });

      it('should return with success', done => {
        respond(event, (err, result) => {
          expect(err).to.not.exist;
          expect(result).to.deep.equal({ domainVerificationToken: 'some-token' });
          done();
        });
      });

      after(() => {
        GenerateDomainVerificationTokensService.generate.restore();
      });
    });

    context('when the event is not valid', () => {
      it('returns an error message', (done) => {
        respond({senderId: null}, (err, result) => {
          expect(result).to.not.exist;
          expect(JSON.parse(err).message).to.equal('No sender specified');
          done();
        });
      });
    });

    after(() => decrypt.default.restore());
  });
});
