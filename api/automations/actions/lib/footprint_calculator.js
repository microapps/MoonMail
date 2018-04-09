import base64url from 'base64-url';

const footprintPropertiesByType = {
  'list.recipient.subscribe': ['userId', 'listId'],
  'campaign.open': ['userId', 'campaignId'],
  'email.delivered': ['userId', 'campaignId']
};

function automationActionToFootprintAdapter(automation = {}) {
  return {
    userId: automation.userId,
    listId: automation.listId,
    campaignId: automation.id
  };
}

function calculate(params) {
  const normalizedProperties = automationActionToFootprintAdapter(params);
  const type = params.triggerEventType || params.type;
  const footprintProperties = footprintPropertiesByType[type];
  const footprintString = footprintProperties.map(prop => normalizedProperties[prop])
    .concat(type).sort().join('');
  return base64url.encode(footprintString);
}

export default {
  calculate
};
