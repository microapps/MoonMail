import aws from 'aws-sdk';

const credentials = new aws.SharedIniFileCredentials({ profile: 'personal' });
aws.config.credentials = credentials;
aws.config.region = 'us-east-1';
const kinesis = new aws.Kinesis();
const routerStreamName = 'MoonMail-v2-events-router-dev-EventsIngestionStream';

const aCampaignId = 'campaign-id';
const anotherCampaignId = 'campaign-id-2';
const events = [
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId, bounceType: 'Transient' } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId } },
  { type: 'email.reported', payload: { campaignId: anotherCampaignId } },
  { type: 'email.reported', payload: { without: 'campaignId' } },
  { type: 'email.notsupported', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId, bounceType: 'Transient' } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId } },
  { type: 'email.reported', payload: { campaignId: anotherCampaignId } },
  { type: 'email.reported', payload: { without: 'campaignId' } },
  { type: 'email.notsupported', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId, bounceType: 'Transient' } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId } },
  { type: 'email.reported', payload: { campaignId: anotherCampaignId } },
  { type: 'email.reported', payload: { without: 'campaignId' } },
  { type: 'email.notsupported', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId, bounceType: 'Transient' } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId } },
  { type: 'email.reported', payload: { campaignId: anotherCampaignId } },
  { type: 'email.reported', payload: { without: 'campaignId' } },
  { type: 'email.notsupported', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId, bounceType: 'Transient' } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId } },
  { type: 'email.reported', payload: { campaignId: anotherCampaignId } },
  { type: 'email.reported', payload: { without: 'campaignId' } },
  { type: 'email.notsupported', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.delivered', payload: { campaignId: aCampaignId } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId, bounceType: 'Transient' } },
  { type: 'email.bounced', payload: { campaignId: aCampaignId } },
  { type: 'email.reported', payload: { campaignId: anotherCampaignId } },
  { type: 'email.reported', payload: { without: 'campaignId' } },
  { type: 'email.notsupported', payload: { campaignId: aCampaignId } }
];

const buildKinesisPutRecordsParams = function buildKinesisPutRecordsParams(events, streamName, eventType) {
  const records = events.map(evt => ({ Data: JSON.stringify(evt), PartitionKey: eventType }));
  return {
    Records: records,
    StreamName: streamName
  };
};
const publishBatch = function publishEventsBatch(events, streamName = routerStreamName, client = kinesis) {
  const params = buildKinesisPutRecordsParams(events, streamName, '12345');
  return client.putRecords(params).promise();
};

publishBatch(events)
  .then(console.log)
  .catch(console.log)
