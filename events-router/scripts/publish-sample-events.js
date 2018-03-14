import aws from 'aws-sdk';

const stage = 'dev';
const settings = {
  dev: { region: 'us-east-1', routerStreamName: 'MoonMail-v2-events-router-dev-EventsIngestionStream', profile: 'personal' },
  prod: { region: 'eu-west-1', routerStreamName: 'MoonMail-v2-events-router-prod-EventsIngestionStream', profile: 'moonmail-deployer' }
};

const credentials = new aws.SharedIniFileCredentials({ profile: settings[stage].profile });
aws.config.credentials = credentials;
aws.config.region = settings[stage].region;
const kinesis = new aws.Kinesis();

const anotherCampaignId = 'my-campaign-id';
const aCampaignId = 'my-campaign-id-2';
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
const publishBatch = function publishEventsBatch(events, streamName = settings[stage].routerStreamName, client = kinesis) {
  const params = buildKinesisPutRecordsParams(events, streamName, '12345');
  return client.putRecords(params).promise();
};

publishBatch(events)
  .then(console.log)
  .catch(console.log);
