'use strict';

import AWS from 'aws-sdk'

export default async function remove(id) {
    try {
        const params = {
            TableName: process.env.WEBHOOKTABLENAME,
            Key: {
                id
            }
        }

        const dynamoDb = new AWS.DynamoDB.DocumentClient();

        return await dynamoDb.delete(params).promise()
    } catch (e) {
        throw e.toString()
    }
}