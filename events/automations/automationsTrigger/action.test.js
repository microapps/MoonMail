import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import 'sinon-as-promised';
import respond from './action';
import * as event from './event.json';
import AutomationsTriggerService from '../lib/automations_trigger_service';

const expect = chai.expect;
chai.use(sinonChai);

describe('triggerAutomations.action', () => {
  before(() => {
    sinon.stub(AutomationsTriggerService, 'execute').resolves(true);
  });
  after(() => {
    AutomationsTriggerService.execute.restore();
  });

  it('should pass valid events to automations trigger', (done) => {
    respond(event, (err) => {
      expect(err).not.to.exist;
      expect(AutomationsTriggerService.execute).to.have.been.calledOnce;
      const triggerArgs = AutomationsTriggerService.execute.lastCall.args[0];
      expect(triggerArgs.length).to.equal(2);
      done();
    });
  });
});
