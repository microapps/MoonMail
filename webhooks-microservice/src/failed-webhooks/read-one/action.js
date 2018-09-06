'use strict';

import AWS from 'aws-sdk'

export default async function readOne(id) {
    try {
        const params = {
            TableName: process.env.FAILEDREQUESTTABLENAME,
            Key: {
                id
            }
        };

        const dynamoDb = new AWS.DynamoDB.DocumentClient();

        return await dynamoDb.get(params).promise()
    } catch (e) {
        throw e.toString()
    }
}