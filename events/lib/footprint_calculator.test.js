import { expect } from 'chai';
import base64url from 'base64-url';
import FootprintCalculator from './footprint_calculator';

describe('FootprintCalculator', () => {
  describe('.calculate()', () => {
    const userId = 'user-id';
    const listId = 'list-id';
    const campaignId = 'campaign-id';
    const listSubscribeType = 'list.recipient.subscribe';
    const listFootprint = base64url.encode(`${listId}${listSubscribeType}${userId}`);
    const openType = 'campaign.open';
    const openFootprint = base64url.encode(`${campaignId}${openType}${userId}`);
    const deliverType = 'email.delivered';
    const deliverFootprint = base64url.encode(`${campaignId}${deliverType}${userId}`);

    context('when the input is an event', () => {
      const openEvent = {
        type: openType,
        payload: { recipient: { listId, userId }, campaign: { id: campaignId } }
      };
      const listEvent = {
        payload: { recipient: { listId, userId } },
        type: listSubscribeType
      };
      const deliverEvent = {
        payload: { listId, userId, campaignId },
        type: deliverType
      };
      const events = [
        { input: listEvent, expected: listFootprint },
        { input: deliverEvent, expected: deliverFootprint },
        { input: openEvent, expected: openFootprint }
      ];

      it('should calculate the correct footprint', () => {
        events.forEach(e => expect(FootprintCalculator
          .calculate(e.input, 'event')).to.equal(e.expected));
      });
    });

    context('when the input is a legacy automation without event type', () => {
      const listAutomation = { userId, listId, type: listSubscribeType };
      const openAutomation = { userId, id: campaignId, type: openType };

      it('calculates the footprint based on the type', () => {
        const automations = [
          { input: listAutomation, expected: listFootprint },
          { input: openAutomation, expected: openFootprint }
        ];
        automations.forEach(a => expect(FootprintCalculator
          .calculate(a.input, 'automation')).to.equal(a.expected));
      });
    });

    context('when the input is an automation with event type', () => {
      const listAutomation = { userId, listId, triggerEventType: listSubscribeType, type: 'whatever' };
      const openAutomation = { userId, id: campaignId, triggerEventType: openType, type: 'whatever' };

      it('calculates the footprint based on the triggerEventType', () => {
        const automations = [
          { input: listAutomation, expected: listFootprint },
          { input: openAutomation, expected: openFootprint }
        ];
        automations.forEach(a => expect(FootprintCalculator
          .calculate(a.input, 'automation')).to.equal(a.expected));
      });
    });
  });
});
