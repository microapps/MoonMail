# Events router
This services facilitates the implementation of pub-sub per topic on top of Amazon Kinesis.

## How it works
The service creates a Kinesis Stream that serves as data ingestion point. It contains a function that automatically deserializes and forwards the event to another service/s according to the configured subscriptions.

## Events
The router expects JSON events with the following structure:

```json
{
  "type": "event.type",
  "payload": {
    "the": "paylpad"
  }
}
```

## Subscriptions
Subscriptions have the following structure:

```json
[
  { "type": "a.type", "subscriberType": "kinesis", "subscribedResource": "A-Stream-Name" },
  { "type": "a.type", "subscriberType": "kinesis", "subscribedResource": "Some-Stream-Name" },
  { "type": "another.type", "subscriberType": "kinesis", "subscribedResource": "Another-Stream-Name" },
  { "type": "another.type.2", "subscriberType": "firehose", "subscribedResource": "A-Delivery-Stream-Name" }
]
```

Messages with certain type will be forwarded to the configured resource. If the type doesn't match any subscriptions' type, it's dismissed.

## Subscribers
For now, events can be only forwarded to another Kinsesis Streams and Kinesis Firehose, more subscriber types (`SQS`, `SNS`, `Lambda`, etc.) to come.

## Set up
1. Create the configuration file with the name `config.<stage-name>.json` and include the following variables:

```javascript
{
  "KINESIS_SHARDS": 1  // Number of shards you want for the Kinesis Stream
}
```

2. Configure your subscriptions in a stringified JSON and save them in [AWS Parameter Store](https://serverless.com/blog/serverless-secrets-api-keys/) with the name `/moonmail/events-router/<stage>/event-subscriptions`. You can use the `./scripts/add-subscription.js` if you don't want to build the configuration manually.


3. Deploy the service: `sls deploy -s <stage> -r <region> --profile <aws-profile>`
