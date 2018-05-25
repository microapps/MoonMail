'use strict';

import * as chai from 'chai';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import { respond } from './action';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';

const expect = chai.expect;

describe('createSender', () => {

  const email = 'david.garcia@microapps.com';
  const apiKey = 'my-api-key';
  const apiSecret = 'my-api-secret';
  const region = 'us-east-1';
  const sender = { email, apiKey, apiSecret, region };
  const userId = 'my-user-id';
  let event;

  describe('#respond()', () => {
    before(() => {
      sinon.stub(decrypt, 'default').resolves({ sub: userId });
    });

    context('when the event is not valid', () => {
      before(() => {
        event = {};
      });
      it('returns an error message', (done) => {
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });

    after(() => {
      decrypt.default.restore();
    });
  });
});
