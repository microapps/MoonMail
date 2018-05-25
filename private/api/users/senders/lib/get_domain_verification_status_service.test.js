import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { GetDomainVerificationStatusService } from './get_domain_verification_status_service';
import { SesWrapper } from './ses_wrapper';

const expect = chai.expect;
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('GetDomainVerificationStatusService', () => {
  const emailAddress = 'some@email.com';
  const senderId = 'sender-id';
  const userId = 'user-id';
  const sender = { id: senderId, emailAddress, verified: true };
  let service;

  describe('#getStatus()', () => {
    before(() => {
      sinon.stub(SesWrapper, 'getDomainVerificationStatus').resolves({
        VerificationAttributes: {
          'email.com': {
            VerificationStatus: 'Pending',
            VerificationToken: 'token'
          }
        }
      });
      service = new GetDomainVerificationStatusService(userId, sender);
    });

    it("gets the domain verification status of the sender's domain", (done) => {
      service.getStatus().then((verificationResult) => {
        expect(verificationResult.VerificationStatus).to.equals('Pending');
        expect(verificationResult.VerificationToken).to.equals('token');
        done();
      });
    });

    after(() => {
      SesWrapper.getDomainVerificationStatus.restore();
    });
  });
});
