

import AWS from 'aws-sdk'
import * as chai from 'chai'
import create from './action'

const expect = chai.expect

describe('create webhook', () => {
    const data = { subject: "list", subjectId: "1", event: "subscribe", webhook: "update-test1.com/webhook", userID: 'abc-123', createdAt: 'day1', updatedAt: 'day1' }

    const successConnection = function () {
        return {
            put: () => ({
                    promise: async () => data
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

    const generateDate = function () {
        return {
            getTime: () => 'day1'
        }
    }

    describe('#create()', () => {

        context('when the event is valid a webhook is saved', () => {
            before(() => {
                AWS.DynamoDB.DocumentClient = successConnection
                Date = generateDate
            })

            it('should register a webhook', async () => {
                const webhook = await create(data)

                expect(webhook).to.have.property('subject')
                expect(webhook.subject).to.be.equal('list')
                expect(webhook).to.have.property('subjectId')
                expect(webhook.subjectId).to.be.equal('1')
                expect(webhook).to.have.property('event')
                expect(webhook.event).to.be.equal('subscribe')
                expect(webhook).to.have.property('webhook')
                expect(webhook.webhook).to.be.equal('update-test1.com/webhook')
                expect(webhook).to.have.property('userID')
                expect(webhook.userID).to.be.equal('abc-123')
                expect(webhook).to.have.property('createdAt')
                expect(webhook.createdAt).to.be.equal('day1')
                expect(webhook).to.have.property('updatedAt')
                expect(webhook.updatedAt).to.be.equal('day1')
            })
        })

        context('when connection goes wrong, an error should be thrown', () => {
            before(() => {
                AWS.DynamoDB.DocumentClient = failureConnection
                Date = generateDate
            })

            it('should throw an error', async () => {
                try {
                    await create(data)
                } catch (e) {
                    expect(e).to.equal('error')
                }
            })
        })
    })
})