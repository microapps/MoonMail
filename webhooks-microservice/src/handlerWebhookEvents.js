'use strict';

import AWS from 'aws-sdk'
import { queryAllWb } from './webhooks/webhook-handler'

module.exports.handlerWebhookEvents = (event, context, callback) => {
    // event = [
    //     { event: 'unsubscribe', item: 'list', itemId: '1', userId: '321' },
    //     { event: 'sent', item: 'campaign', itemId: 'abc', userId: '' }
    // ]

    getEvents(event)
        .then(getWebhooks)
        .then(checkWebhooks)
        .then(reduceWebhooks)
        .then(checkWebhooks)
        .then(invokeAllWebhooks)
        .then(r => callback(null))
        .catch(e => handleError(e, callback))
}

const getEvents = async (event) => {
    let events = [];

    event.Records.forEach((record) => {
        const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
        events.push(JSON.parse(payload).payload)
    });
    
    console.log('Payload: ', events)
    return events
}

const handleError = (e, callback) => {
    if (e === 'NO-WEBHOOKS-FOUND') {
        console.log(e)
        callback(null)
    } else {
        callback(e)
    }
}

const setEventInfo = async (items, event) => {
    if (items && items.length > 0 && event) {
        for (const i in items) {
            if(event.recipient)
                items[i].recipient = event.recipient
            //if(other types of info) <- rebuild logic once new types are added
        }
        return items
    }
    return items

}

const dbParams = (event) => {
    const itemId = event.itemId || ''
    return `${event.event}-${event.item}-${itemId}`
}

const readAllAndSetInfo = async (event) => {
    try{
        const params = dbParams(event)
        const { Items } = await queryAllWb(params)
        return await setEventInfo(Items, event)
    } catch (e) {
        throw e
    }
}

const getWebhooks = async (events) => {
    try {
        const dbPromises = []

        for (const i in events) {
            const promise = readAllAndSetInfo(events[i])
            dbPromises.push(promise)
        }

        return await Promise.all(dbPromises)
    } catch (e) {
        throw e
    }
}

const reduceWebhooks = async (webhooks) => webhooks.reduce((wb1, wb2) => [...wb1, ...wb2])

const checkWebhooks = async (webhooks) => {
    if (webhooks && webhooks.length > 0) {
        return webhooks
    }
    throw 'NO-WEBHOOKS-FOUND'

}

const invokerPayload = (webhook) => ({
    webhook,
    source: 'handler',
    attempts: process.env.REQUESTATTEMPTS
})

const invokeAllWebhooks = async (webhooks) => { // consider recursion for big pile of webhooks
    try {
        const webhookPromises = []
        for (const i in webhooks) {
            const payload = invokerPayload(webhooks[i])
            webhookPromises.push(invokeTrigger(payload))
        }

        await Promise.all(webhookPromises)
        return true
    } catch (e) {
        throw e
    }
}

const invokeTrigger = async (payload) => {
    const lambda = new AWS.Lambda()
    const result = await lambda.invoke({ FunctionName: process.env.TRIGGERWBFUNCTIONNAME, InvocationType: 'Event', Payload: JSON.stringify(payload) }).promise()
    return true
}