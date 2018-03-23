# Webhooks Microservice

Serverless service that provides a CRUD for webhooks and all the logic for requests and retries.

## Installation

Make sure that you use Serverless v1.

1. Start by cloning Webhooks Service to you preferred location.
2. Next up cd into the service folder you cloned
3. Run `npm install`
4. Deploy with `serverless deploy`

## How to use: Webhooks CRUD

Simply perform requests against the exposed endpoints setting a JWT to the Authorization Header Bearer Token.

### JWT

We use JWT in our authentication process, for every request a token will be necessary. Generate one and set it in your Authorization header.

### Body Params

- item: the item that is triggerring a webhook, i.e. campaigns, lists, etc
- itemId: id of the related item (obrigatory dependending on the specified item)
- event: the event tha will trigger the webhook. i.e. subscribe, unsubscribe
- url: url to which the webhook will be sent

### Create

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" -X POST https://XXXX.execute-api.region.amazonaws.com/dev/webhooks --data '{ "item": "list","itemId": "1","event": "unsubscribe","url": "https://www.example.com/webhook"}'
```

### Read all

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://XXXX.execute-api.region.amazonaws.com/dev/webhooks
```

### Read one

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" https://XXXX.execute-api.region.amazonaws.com/dev/webhooks/<id>
```

### Update

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" -X PUT https://XXXX.execute-api.region.amazonaws.com/dev/webhooks/<id> --data '{ "item": "list","itemId": "1","event": "unsubscribe","url": "https://www.example.com/webhook"}'
```

### DELETE

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" -X DELETE https://XXXX.execute-api.region.amazonaws.com/dev/webhooks/<id>
```

## How it works: Handlers

In order to send notifications to any given endpoint Webhooks Service makes use of three main functionalities: A Handler for events, a Trigger for endpoints and a Sniffer for failed requests.

### Handler

The Handler receives a list of events and looks for all the webhooks that match at least one item from given list. Each event is expected to have `event`, `item`, `itemId`, `userId`.

- item: the item that is triggerring a webhook, i.e. campaigns, lists, etc
- itemId: id of the related item (obrigatory dependending on the specified item)
- event: the event tha will trigger the webhook. i.e. subscribe, unsubscribe
- userId: id of the user realated to the event

Here all that is done is a search in Webhook's table and then, for each webhook found matching the event criteria, a Trigger will be called.

All the code related to the Handler can be found at [src/handlerWebhookEvents](src/handlerWebhookEvents.js).

### Trigger

The Tigger receives a Webhook record and then makes a request towards its endpoint. This request will by default `retry three times` in case of failures, then, considering the request final status code, the Trigger will decide what to do with this request considering some information:

There are two important pieces of information that the Trigger will be paying attention before deciding the request's destination: `source` and `status code`.

- Source, is what called the Trigger. Here there are two possible options: `handler` and `sniffer`
- Status code, the final status code of the request.

Then four outputs will be possible:

- Status code is not in the range 200-299 and Source is Handler:
If after all three attempts the final status code is still a failure (not >= 200 && <= 299 ) and the source is the Handler, this request will be saved to a new table of failed requests and a `timer` will be set for a new `attempt`.
- Status code is in the range 200-299 and Source is Handler:
If any of the three attempts results in a 200 status code and the source is the Handler, nothing else will happen and the operation will be considered a success.
- Status code is not in the range 200-299 and Source is Sniffer:
If after a new attempt the final status code is still a failure (not >= 200 && <= 299 ) and the source is the Sniffer, the record for this failed request will be updated with a new `timer` and the number of `attempts` will be increased by one.
- Status code is in the range 200-299 and Source is Sniffer:
If a new attempt results in a 200 status code and the source is the Sniffer, the record for this failed request will be removed and the operation will be considered a success.

All the code related to the Handler can be found at [src/triggerWbhooks](src/triggerWebhooks.js).

### Sniffer

The Sniffer is a service running on a Cloud Watch Scheduled event, where every amount of time, with a `default of one minute`, it checks for the existence of failed requests.

There are three possible outputs for when the Sniffer find a failed request:

- A Failed Request is found, but the Webhook record for this request no longer exists:
It is possible that the user created a webhook but then removed it (possible reasons: wrong url, wrong params, no longer wants a webhook, created only for test), if that is the case this failed request is removed and no longer will be retried.
- A Failed Request is found, but the number of attemps has reached the limit:
If the found failed request has reached its maximum number of attemps, this request is considered faulty: it will be removed and no longer retried.
- A Failed Request is found, but its timer it not up yet:
If the found request was updated three minutes ago, but its timer is set to four minutes, then this request is ignored and will be called another moment when its timer condition is satisfied.

Finally, if none of the above conditions fail then the Trigger will be called for the found failed request.

All the code related to the Handler can be found at [src/snifferFailedRequests](src/snifferFailedRequests.js).

### Timer and Attempts

* `Timer`: is by default `two minutes` and is `multiplied by two` for every further attempt.
* `Attempts`: by default there is a limit of `ten attemps` for each failed request.

## AWS services used

- Lambda
- API Gateway
- DynamoDB
- Cloud Watch Scheduled Events
- Cloud Watch Logs
