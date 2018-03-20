import AWS from 'aws-sdk'

module.exports.getEvent = (event, context, callback) => {
    //get event type and subject if exists
    //invoke lambda trigger
}

module.exports.triggerWebhook = (event, context, callback) => {
    //search dynamo for registers with specified event and subject
    //request found webhook
}