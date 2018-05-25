import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { GetDkimStatusService } from './get_dkim_status_service';
import { SesWrapper } from './ses_wrapper';

const expect = chai.expect;
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('GetDkimStatusService', () => {
  const emailAddress = 'some@email.com';
  const senderId = 'sender-id';
  const userId = 'user-id';
  const sender = { id: senderId, emailAddress, verified: true };
  let service;

  describe('#getStatus()', () => {
    before(() => {
      sinon.stub(SesWrapper, 'getDkimStatus').resolves({
        DkimAttributes: {
          'email.com': {
            DkimEnabled: false,
            DkimVerificationStatus: 'Pending',
            DkimTokens: ['t1', 't2', 't3']
          }
        }
      });
      service = new GetDkimStatusService(userId, sender);
    });

    it("gets the status the dkim verification status of the sender's domain", (done) => {
      service.getStatus().then((verificationResult) => {
        expect(verificationResult.DkimEnabled).to.be.false;
        expect(verificationResult.DkimVerificationStatus).to.equals('Pending');
        expect(verificationResult.DkimTokens).to.deep.equals(['t1', 't2', 't3']);
        done();
      });
    });

    after(() => {
      SesWrapper.getDkimStatus.restore();
    });
  });
});
