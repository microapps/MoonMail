import chai from 'chai';
import sinon from 'sinon';
import 'sinon-as-promised';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import LimitsValidationService from './limits_validation_service';
import { QuotaExceeded, SandboxMode } from '../errors';

const expect = chai.expect;
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('LimitsValidationService', () => {
  let limitsValidationService;

  describe('#perform()', () => {
    context('when the recipients limit is reached', () => {

      before(() => {
        const recipientsCount = parseInt(Math.random() * 100);
        const currentState = { recipientsCount: recipientsCount + 1 };
        limitsValidationService = LimitsValidationService.generate({ recipientsCount })(currentState);
      });

      it('should raise an error', (done) => {
        limitsValidationService.perform().catch((err) => {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.message).to.equal('Quota exceeded');
          done();
        });
      });
    });

    context('when the daily campaign limit is reached', () => {

      before(() => {
        const sentCampaignsInDay = parseInt(Math.random() * 100);
        const currentState = { sentCampaignsInDay: sentCampaignsInDay + 2, recipientsCount: 1 };
        limitsValidationService = LimitsValidationService.generate({ sentCampaignsInDay })(currentState);
      });

      it('should raise an error', (done) => {
        limitsValidationService.perform().catch((err) => {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.message).to.equal('Quota exceeded');
          done();
        });
      });
    });

    context('when no limit is reached', () => {
      before(() => {
        const currentState = { sentCampaignsInDay: 1, recipientsCount: 1 };
        limitsValidationService = LimitsValidationService.generate()(currentState);
      });

      it('should resolve an empty object', (done) => {
        const promise = limitsValidationService.perform();
        expect(promise).to.eventually.deep.equal({}).notify(done);
      });
    });
  });
});
