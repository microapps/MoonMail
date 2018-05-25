'use strict';

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { GenerateDomainVerificationTokensService } from './generate_domain_verification_tokens_service';
import { User } from '../../../../lib/models/user';

const expect = chai.expect;
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('GenerateDomainVerificationTokensService', () => {
  const emailAddress = 'some@email.com';
  const senderId = 'sender-id';
  const userId = 'user-id';
  const sender = {id: senderId, emailAddress: emailAddress, verified: true};
  let service;
  let verifyDomainDkim;

  describe('#generate()', () => {
    before(() => {
      sinon.stub(User, 'fetchSender').resolves(sender);
      service = new GenerateDomainVerificationTokensService(userId, senderId);
      verifyDomainDkim = sinon.stub(service, '_verifyDomain').resolves({});
    });

    it("generates the dkim with the sender's domain", done => {
      service.generate().then(() => {
        expect(verifyDomainDkim.lastCall.args[0]).to.equal('email.com');
        done();
      });
    });

    after(() => {
      User.fetchSender.restore();
      service._verifyDomain.restore();
    });
  });
});
