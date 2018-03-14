import aws from 'aws-sdk';
import Joi from 'joi';
import R from 'ramda';

const stage = 'dev';
const settings = {
  dev: { region: 'us-east-1', profile: 'personal' },
  prod: { region: 'eu-west-1', profile: 'moonmail-deployer' }
};

const subscriptionSchema = Joi.object({
  type: Joi.string().required(),
  subscriberType: Joi.string().valid(['kinesis', 'firehose']).required(),
  subscribedResource: Joi.string().required()
});
const subscriptionsSchema = Joi.array().items(subscriptionSchema).unique((a, b) => R.equals(a, b));

const subscription = {
  type: 'event.type',
  subscriberType: 'kinesis',
  subscribedResource: 'KinesisStream'
};

Joi.assert(subscription, subscriptionSchema);

const credentials = new aws.SharedIniFileCredentials({ profile: settings[stage].profile });
aws.config.credentials = credentials;
aws.config.region = settings[stage].region;
const ssm = new aws.SSM();

const parameterPath = `/moonmail/events-router/${stage}`;
const subscriptionsParameterName = `${parameterPath}/event-subscriptions`;

function getParameter(parameterName) {
  return ssm.getParameter({ Name: parameterName }).promise()
    .then(res => JSON.parse(res.Parameter.Value))
    .catch(err => (err.code === 'ParameterNotFound' ? [] : Promise.reject(err)));
}

function getSubscriptions() {
  return getParameter(subscriptionsParameterName);
}

function addSubscription(subscriptions, newSubscription) {
  const newSubscriptions = [...subscriptions, newSubscription];
  Joi.assert(newSubscriptions, subscriptionsSchema);
  const params = {
    Name: subscriptionsParameterName,
    Type: 'String',
    Value: JSON.stringify(newSubscriptions),
    Overwrite: true
  };
  return ssm.putParameter(params).promise();
}

getSubscriptions()
  .then(subscriptions => addSubscription(subscriptions, subscription))
  .then(() => getSubscriptions())
  .then(console.log)
  .catch(console.log);
