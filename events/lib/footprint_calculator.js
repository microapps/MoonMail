import base64url from 'base64-url';
import R from 'ramda';

const footprintPropertiesByType = {
  'list.recipient.subscribe': ['userId', 'listId'],
  'campaign.open': ['userId', 'campaignId'],
  'email.delivered': ['userId', 'campaignId']
};

const footprintPropertiesMapping = {
  automation: automationToFootprintAdapter,
  event: eventToFootprintAdapter
};

function automationToFootprintAdapter(automation = {}) {
  return {
    userId: automation.userId,
    listId: automation.listId,
    campaignId: automation.id
  };
}

const eventPropertiesMapping = {
  'email.delivered': payload => ({
    userId: R.path(['userId'], payload),
    campaignId: R.path(['campaignId'], payload)
  })
};

function eventToFootprintAdapter({ type, payload } = {}) {
  if (eventPropertiesMapping[type]) return eventPropertiesMapping[type](payload);
  return {
    userId: R.path(['recipient', 'userId'], payload),
    listId: R.path(['recipient', 'listId'], payload),
    campaignId: R.path(['campaign', 'id'], payload)
  };
}

function calculate(params, source) {
  const normalizedProperties = footprintPropertiesMapping[source](params);
  const type = params.triggerEventType || params.type;
  const footprintProperties = footprintPropertiesByType[type];
  const footprintString = footprintProperties.map(prop => normalizedProperties[prop])
    .concat(type).sort().join('');
  return base64url.encode(footprintString);
}

export default {
  calculate
};
