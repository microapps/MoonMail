import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { SesCredentialsValidator } from './ses_credentials_validator';
import awsMock from 'aws-sdk-mock';
import { SandboxMode } from '../../../lib/errors';

const expect = chai.expect;
chai.use(chaiAsPromised);

describe('SesCredentialsValidator', () => {
  const creds = {apiKey: '123', apiSecret: '123', region: 'eu'};
  describe('.isValid()', () => {
    context('when the credentials are wrong', () => {
      before(() => {
        awsMock.mock('SES', 'getSendQuota', cb => {
          const error = {
            message: 'The security token included in the request is invalid.',
            code: 'InvalidClientTokenId',
            statusCode: 403
          };
          return cb(error);
        });
      });

      it('should reject the promise', done => {
        const promise = SesCredentialsValidator.isValid(creds);
        expect(promise).to.be.rejectedWith(Error).notify(done);
      });

      after(() => awsMock.restore('SES'));
    });

    context('when the credentials are valid', () => {
      context('and the account is in sandbox mode', () => {
        before(() => awsMock.mock('SES', 'getSendQuota', cb => cb(null, {Max24HourSend: 200})));

        it('should reject the promise', done => {
          const promise = SesCredentialsValidator.isValid(creds);
          expect(promise).to.be.rejectedWith(SandboxMode).notify(done);
        });

        after(() => awsMock.restore('SES'));
      });

      context('and the account is in production', () => {
        const quota = {Max24HourSend: 100000};
        before(() => awsMock.mock('SES', 'getSendQuota', cb => cb(null, quota)));

        it('should resolve true', done => {
          const promise = SesCredentialsValidator.isValid(creds);
          expect(promise).to.eventually.deep.equal(quota).notify(done);
        });

        after(() => awsMock.restore('SES'));
      });
    });
  });
});
