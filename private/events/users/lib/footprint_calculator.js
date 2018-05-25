import base64url from 'base64-url';

const footprintPropertiesByType = {
  'list.recipient.subscribe': ['userId', 'listId'],
  'campaign.open': ['userId', 'campaignId']
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
  const footprintProperties = footprintPropertiesByType[params.type];
  const footprintString = footprintProperties.map(prop => normalizedProperties[prop])
    .concat(params.type).sort().join('');
  return base64url.encode(footprintString);
}

export default {
  calculate
};
