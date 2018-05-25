'use strict';

import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as decrypt from '../../../lib/auth-token-decryptor';
import * as sinonAsPromised from 'sinon-as-promised';
import { SetSesCredentialsService } from '../lib/set_ses_credentials_service';

const expect = chai.expect;

describe('setSesCredentials', () => {
  let event;
  const user = {id: 'user-id'};

  describe('#respond()', () => {
    before(() => sinon.stub(decrypt, 'default').resolves({ sub: 'user-id' }));

    context('when the event is valid', () => {
      const ses = {apiKey: 'key', apiSecret: 'secret', region: 'region', sendingQuota: 15000};
      before(() => {
        event = {ses};
      });

      context('and is able to set the credentials', () => {
        before(() => sinon.stub(SetSesCredentialsService, 'run').resolves(user));

        it('should return the user info', done => {
          respond(event, (err, result) => {
            expect(err).to.not.exist;
            const expectedResponse = user;
            expect(result).to.deep.equal(expectedResponse);
            done();
          });
        });

        after(() => SetSesCredentialsService.run.restore());
      });

      context('and is not able to set credentials', () => {
        const serviceError = 'someError';
        before(() => sinon.stub(SetSesCredentialsService, 'run').rejects(serviceError));

        it('should return an error', done => {
          respond(event, (err, result) => {
            expect(result).to.not.exist;
            expect(JSON.parse(err).message).to.equal(serviceError);
            done();
          });
        });

        after(() => SetSesCredentialsService.run.restore());
      });
    });

    context('when the event is not valid', () => {
      it('returns an error message', (done) => {
        respond({ses: {}}, (err, result) => {
          expect(result).to.not.exist;
          expect(JSON.parse(err).message).to.equal('No credentials specified');
          done();
        });
      });
    });

    after(() => decrypt.default.restore());
  });
});
