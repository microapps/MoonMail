import faker from 'faker';
import base64 from 'base64-url';
import moment from 'moment';
import Api from '../src/Api';
import Events from '../src/domain/Events';
import uuidv4 from 'uuid/v4';

export function buildRecipient({ userId, listId, email = `r_${uuidv4()}@example.com`, status = 'subscribed', campaignActivity }) {
  const id = base64.encode(email);
  return {
    id,
    email,
    listId,
    userId,
    subscriptionOrigin: 'listImport',
    isConfirmed: true,
    status,
    createdAt: moment().unix(),
    campaignActivity: campaignActivity || []
  };
}

export function generateRecipients({ userId, listId, total, status }) {
  return Array(total).fill(0).map(() => buildRecipient({ userId, listId, status }));
}

function generateCampaignEvents(recipients, campaignId, eventType, total, startingOnDate) {
  const count = Math.min(recipients.length, total);
  return Array(count).fill(0).map((r, index) => {
    const event = {
      type: eventType,
      payload: {
        campaignId,
        recipientId: recipients[index].id,
        listId: recipients[index].listId,
        timestamp: startingOnDate.add(index, 'days').unix()
      }
    };
    return event;
  });
}

export function simulateCampaignActivity({ recipients, campaignId, totalSent, totalOpened, totalClicked, startingOnDate = moment() }) {
  const sentEvents = generateCampaignEvents(recipients, campaignId, Events.emailDelivered, totalSent, startingOnDate);
  const openedEvents = generateCampaignEvents(recipients, campaignId, Events.emailOpened, totalOpened, startingOnDate);
  const clickEvents = generateCampaignEvents(recipients, campaignId, Events.emailClicked, totalClicked, startingOnDate);
  return Api.processCampaignActivity([...sentEvents, ...openedEvents, ...clickEvents]);
}
