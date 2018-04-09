import { expect } from 'chai';
import AutomationActionDispatcherFactory from './AutomationActionDispatcherFactory';
import ConditionalAutomationActionDispatcher from './ConditionalAutomationActionDispatcher';
import ConditionalDeferredAutomationActionDispatcher from './ConditionalDeferredAutomationActionDispatcher';
import UnconditionalAutomationActionDispatcher from './UnconditionalAutomationActionDispatcher';

describe('AutomationActionDispatcherFactory', () => {
  describe('.build()', () => {
    context('when the automation action has no conditions', () => {
      const automationAction = {
        id: 'campaign-id',
        automationId: 'automation-id',
        type: 'list.recipient.subscribe',
        delay: 3600,
        status: 'active',
        name: 'Unconditional automation action'
      };

      it('builds an UnconditionalAutomationActionDispatcher', () => {
        const dispatcher = AutomationActionDispatcherFactory.build(automationAction);
        expect(dispatcher).to.be.an.instanceOf(UnconditionalAutomationActionDispatcher);
      });
    });

    context('when the automation action has conditions', () => {
      const automationAction = {
        id: 'campaign-id',
        automationId: 'automation-id',
        type: 'list.recipient.subscribe',
        delay: 0,
        status: 'active',
        name: 'Conditional automation action',
        conditions:  [{
          type: 'aggregationCount',
          resource: 'recipient.activity',
          filters: [{ eventType: { eq: 'email.opened' } }],
          count: 0,
          delay: 0
        }]
      };

      context('and can be evaluated straight away', () => {
        it('builds an ConditionalAutomationActionDispatcher', () => {
          const dispatcher = AutomationActionDispatcherFactory.build(automationAction);
          expect(dispatcher).to.be.an.instanceOf(ConditionalAutomationActionDispatcher);
        });
      });

      context('and cannot be evaluated straight away', () => {
        it('builds an ConditionalDeferredAutomationActionDispatcher', () => {
          const deferredConditions = [{
            type: 'aggregationCount',
            resource: 'recipient.activity',
            filters: [{ eventType: { eq: 'email.opened' } }],
            count: 0,
            delay: 300
          }];
          const deferredAutomationAction = Object.assign({}, automationAction, { conditions: deferredConditions });
          const dispatcher = AutomationActionDispatcherFactory.build(deferredAutomationAction);
          expect(dispatcher).to.be.an.instanceOf(ConditionalDeferredAutomationActionDispatcher);
        });
      });
    });
  });
});
