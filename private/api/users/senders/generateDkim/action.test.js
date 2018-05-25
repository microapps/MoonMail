'use strict';

import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import * as sinonAsPromised from 'sinon-as-promised';
import { GenerateDkimTokensService } from '../lib/generate_dkim_tokens_service';

const expect = chai.expect;

describe('generateDkim', () => {
  let event;
  const user = {id: 'user-id'};

  describe('#respond()', () => {
    before(() => sinon.stub(decrypt, 'default').resolves({ sub: 'user-id' }));

    context('when the event is valid', () => {
      before(() => {
        event = {senderId: 'sender-id'};
        sinon.stub(GenerateDkimTokensService, 'generate').resolves({DkimTokens: 'some-tokens'});
      });

      it('should return with success', done => {
        respond(event, (err, result) => {
          expect(err).to.not.exist;
          const expectedResponse = {dkimTokens: 'some-tokens'};
          expect(result).to.deep.equal(expectedResponse);
          done();
        });
      });

      after(() => GenerateDkimTokensService.generate.restore());
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
