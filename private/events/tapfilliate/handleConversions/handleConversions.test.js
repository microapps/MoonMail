import chai from 'chai';
import sinon from 'sinon';
import nock from 'nock';
import * as sinonAsPromised from 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import validEvents from './fixtures/validEvents.json';
import invalidEvents from './fixtures/invalidEvents.json';
import handleConversions from './handleConversions';

const expect = chai.expect;
chai.use(sinonChai);

describe('handleConversions', () => {
  let tapfiliateApi;
  // Values taken from validEvent fixture
  const affiliateRef = '0942d0b0-1855-11e7-9f66-a94a465eb029';
  const amount = 9700;
  const externalId = 'ch_1A4SMYHWQi1QKLvWKIGR4r8n';
  //

  beforeEach(() => {
    tapfiliateApi = nock('https://tapfiliate.com');
    tapfiliateApi
      .post('/api/1.5/conversions/?override_max_cookie_time=false', JSON.stringify({
        click_id: affiliateRef,
        amount: amount / 100,
        external_id: externalId
      }))
      .reply(204, {
        not: { important: 'currently' }
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  context('when a valid event is received', () => {
    it('creates a conversion in the name of the affiliateRef', (done) => {

      handleConversions(validEvents).then((result) => {
        expect(result).to.exist;
        expect(tapfiliateApi.isDone()).to.be.true;
        done();
      }).catch(error => done(error));
    });
  });

  context('when an invalid event is received', () => {
    it('skips the processing', (done) => {
      handleConversions(invalidEvents).then((result) => {
        expect(result).to.exist;
        expect(tapfiliateApi.isDone()).to.be.false;
        done();
      }).catch(error => done(error));
    });
  });
});
