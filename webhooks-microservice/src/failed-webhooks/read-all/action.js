'use strict';

import AWS from 'aws-sdk'

export default async function readAll() {
    try {
        const params = {
            TableName: process.env.FAILEDREQUESTTABLENAME
        }

        const dynamoDb = new AWS.DynamoDB.DocumentClient();

        return await dynamoDb.scan(params).promise()
    } catch (e) {
        throw e.toString()
    }
};