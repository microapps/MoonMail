import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import { FetchFreeSenderInformationService } from './fetch_free_sender_information_service';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('FetchFreeSenderInformationService', () => {
  const userId = 'user-id';
  const defaultsOnlyConfig = {
    defaults: { emailAddress: 'no-reply@default.com', fromName: 'Default', region: 'eu-west-1', apiKey: 'foo', apiSecret: 'bar' }
  };
  const additionalAddressesConfig = Object.assign(
    {},
    defaultsOnlyConfig,
    {
      senders: [
        { emailAddress: 'no-reply@default-1.com' },
        { emailAddress: 'no-reply@default-2.com' },
        { emailAddress: 'no-reply@default-3.com' }
      ]
    }
  );
  const withCustomKeysConfig = Object.assign(
    {},
    defaultsOnlyConfig,
    { senders: [{ emailAddress: 'no-reply@default-4.com', fromName: 'Default-4', region: 'us-east-1', apiKey: 'fooo', apiSecret: 'baar' }] }
  );

  describe('#getData()', () => {
    context('when only the default address is configured', () => {
      before(() => process.env.FREE_SENDERS_CONFIG = JSON.stringify(defaultsOnlyConfig));
      after(() => delete process.env.FREE_SENDERS_CONFIG);

      it('retrieves the default sender', (done) => {
        const service = new FetchFreeSenderInformationService(userId, null);
        service.getData().then((data) => {
          expect(data).to.deep.equal(defaultsOnlyConfig.defaults);
          done();
        }).catch(err => done(err));
      });
    });

    context('when there are additional addresses', () => {
      before(() => process.env.FREE_SENDERS_CONFIG = JSON.stringify(additionalAddressesConfig));
      after(() => delete process.env.FREE_SENDERS_CONFIG);

      it('retrieves the default sender', (done) => {
        const service = new FetchFreeSenderInformationService(userId, null);
        service.getData().then((data) => {
          const defaults = additionalAddressesConfig.defaults;
          expect(data).to.have.property('apiKey', defaults.apiKey);
          expect(data).to.have.property('apiSecret', defaults.apiSecret);
          expect(data).to.have.property('region', defaults.region);
          expect(data).to.have.property('fromName', defaults.fromName);
          const customAddresses = additionalAddressesConfig.senders.map(s => s.emailAddress);
          expect(customAddresses).to.contain(data.emailAddress);
          done();
        }).catch(err => done(err));
      });
    });
  });
});
