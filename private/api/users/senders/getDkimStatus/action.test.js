'use strict';

import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as decrypt from '../../../../lib/auth-token-decryptor';
import * as sinonAsPromised from 'sinon-as-promised';
import { GetDkimStatusService } from '../lib/get_dkim_status_service';

const expect = chai.expect;

describe('getDkimStatus', () => {
  let event;
  const user = {id: 'user-id'};

  describe('#respond()', () => {
    before(() => sinon.stub(decrypt, 'default').resolves({ sub: 'user-id' }));

    context('when the event is valid', () => {
      before(() => {
        event = {senderId: 'sender-id'};
        sinon.stub(GetDkimStatusService, 'status').resolves({data: 'some-data'});
      });

      it('should return with success', done => {
        respond(event, (err, result) => {
          expect(err).to.not.exist;
          const expectedResponse = {data: 'some-data'};
          expect(result).to.deep.equal(expectedResponse);
          done();
        });
      });

      after(() => GetDkimStatusService.status.restore());
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
