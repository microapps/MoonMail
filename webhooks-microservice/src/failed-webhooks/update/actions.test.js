

import AWS from 'aws-sdk'
import * as chai from 'chai'
import update from './action'

const expect = chai.expect

describe('update webhook', () => {
    let webhookID
    let webhookData
    const id = '123'
    const oldData = { subject: "list", subjectId: "1", event: "subscribe", webhook: "update-test1.com/webhook", userID: 'abc-123', createdAt: 'day1', updatedAt: 'day1' }
    const newData = { subject: "list", subjectId: "2", event: "subscribe", webhook: "update-test2.com/webhook", userID: 'abc-123', createdAt: 'day1', updatedAt: 'now' }
    const response = { oldData, newData }

    const successConnection = function () {
        return {
            put: () => ({
                    promise: async () => response.oldData // dynamoDB put can only retrive old values
                }),
            get: () => ({
                    promise: async () => response.newData // a new get is made to get updated values
                })
        }
    }

    const failureConnection = function () {
        return {
            put: () => ({
                    promise: async () => { throw 'error' }
                })
        }
    }

    describe('#update()', () => {

        context('when the event is valid a webhook is saved', () => {
            before(() => {
                webhookID = id
                webhookData = oldData
                AWS.DynamoDB.DocumentClient = successConnection
            })

            it('should register a webhook', async () => {
                const webhook = await update(webhookID, webhookData)

                expect(webhook).to.have.property('subject')
                expect(webhook.subject).to.be.equal('list')
                expect(webhook).to.have.property('subjectId')
                expect(webhook.subjectId).to.be.equal('2')
                expect(webhook).to.have.property('event')
                expect(webhook.event).to.be.equal('subscribe')
                expect(webhook).to.have.property('webhook')
                expect(webhook.webhook).to.be.equal('update-test2.com/webhook')
                expect(webhook).to.have.property('userID')
                expect(webhook.userID).to.be.equal('abc-123')
                expect(webhook).to.have.property('createdAt')
                expect(webhook.createdAt).to.be.equal('day1')
                expect(webhook).to.have.property('updatedAt')
                expect(webhook.updatedAt).to.be.equal('now')
            })
        })

        context('when connection goes wrong, an error should be thrown', () => {
            before(() => {
                webhookID = id
                webhookData = oldData
                AWS.DynamoDB.DocumentClient = failureConnection
            })

            it('should throw an error', async () => {
                try {
                    await update(webhookID, webhookData)
                } catch (e) {
                    expect(e).to.equal('error')
                }
            })
        })
    })
})