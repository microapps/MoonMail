// 'use strict';

// import * as chai from 'chai';
// const chaiAsPromised = require('chai-as-promised');
// const sinonChai = require('sinon-chai');
// import { expect } from 'chai';
// import * as sinon from 'sinon';
// import { AttachSenderService } from './attach_sender_service';
// import { FreeLimitsValidationService } from './free_limits_validation_service';
// import { FetchFreeSenderInformationService } from './fetch_free_sender_information_service';
// import { CheckReputationService } from './check_reputation_service';
// import { ChargeEmailsService } from './charge_emails_service';
// import { BadReputation, QuotaExceeded, StripeChargeError } from '../../../lib/errors';
// import * as sinonAsPromised from 'sinon-as-promised';
// const awsMock = require('aws-sdk-mock');
// const AWS = require('aws-sdk');

// chai.use(chaiAsPromised);
// chai.use(sinonChai);

// describe('AttachSenderService', () => {
//   let attachSenderService;
//   let sns;
//   const userId = 'user-id';
//   const plan = 'free';
//   const paidPlan = 'paid';
//   const senderId = 'sender-id';
//   const campaignId = 'campaign-id';
//   const limitsValidationService = sinon.createStubInstance(FreeLimitsValidationService);
//   const fetchSenderInformationService = sinon.createStubInstance(FetchFreeSenderInformationService);
//   const chargeEmailsService = sinon.createStubInstance(ChargeEmailsService);
//   const options = {
//     recipientsCount: 250,
//     sentCampaignsInMonth: 4,
//     campaign: { id: campaignId }
//   };
//   const senderData = {
//     apiKey: 'api-key',
//     apiSecret: 'api-secret',
//     region: 'region',
//     emailAddress: 'email@example.com',
//     fromName: 'from-name'
//   };

//   beforeEach(() => {
//     awsMock.mock('SNS', 'publish');
//     sns = new AWS.SNS();
//     process.env.PRECOMPILE_CAMPAIGN_TOPIC_ARN = 'precompile-topic-arn';
//     process.env.UPDATE_CAMPAIGN_TOPIC_ARN = 'update-campaign-topic-arn';

//     fetchSenderInformationService.getData.resolves(senderData);
//     attachSenderService = new AttachSenderService(
//       sns,
//       userId,
//       plan,
//       senderId,
//       limitsValidationService,
//       fetchSenderInformationService,
//       null,
//       null,
//       options
//     );
//   });
//   describe('.create', () => {
//     it('creates attach sender service instances', (done) => {
//       expect(AttachSenderService.create(sns, userId, plan, senderId, options)).to.be.instanceof(AttachSenderService);
//       done();
//     });
//   });
//   describe('#attachSender()', () => {
//     context('when sender is under the plan limits', () => {
//       before(() => {
//         limitsValidationService.validate.resolves({});
//       });

//       it('publishes the attachSender canonical message to precompileCampaign SNS topic', (done) => {
//         attachSenderService.attachSender().then(() => {
//           expect(sns.publish.callCount).to.equal(1);
//           expect(sns.publish.lastCall.args[0].Message).to.contain('sender');
//           expect(sns.publish.lastCall.args[0].Message).to.contain('recipientsCount');
//           expect(sns.publish.lastCall.args[0].Message).to.contain('apiKey');
//           expect(sns.publish.lastCall.args[0].TopicArn).to.equal('precompile-topic-arn');
//           done();
//         });
//       });

//       context('when the stripe charge was successful', () => {
//         const chargeEmailsService = sinon.createStubInstance(ChargeEmailsService);
//         const limitsValidationService = sinon.createStubInstance(FreeLimitsValidationService);
//         beforeEach(() => {
//           chargeEmailsService.charge.resolves(senderData);
//           limitsValidationService.validate.resolves({});
//           attachSenderService = new AttachSenderService(
//             sns,
//             userId,
//             paidPlan,
//             senderId,
//             limitsValidationService,
//             fetchSenderInformationService,
//             null,
//             chargeEmailsService,
//             options
//           );
//         });

//         it('publishes the attachSender canonical message to precompileCampaign SNS topic', (done) => {
//           attachSenderService.attachSender().then(() => {
//             expect(sns.publish.callCount).to.equal(1);
//             expect(sns.publish.lastCall.args[0].Message).to.contain('sender');
//             expect(sns.publish.lastCall.args[0].Message).to.contain('recipientsCount');
//             expect(sns.publish.lastCall.args[0].Message).to.contain('apiKey');
//             expect(sns.publish.lastCall.args[0].TopicArn).to.equal('precompile-topic-arn');
//             done();
//           }).catch(err => done(err));
//         });

//         after(() => {
//           chargeEmailsService.charge.restore();
//           limitsValidationService.validate.restore();
//         });
//       });

//       context('when the stripe charge was not successful', () => {
//         const chargeEmailsService = sinon.createStubInstance(ChargeEmailsService);
//         const limitsValidationService = sinon.createStubInstance(FreeLimitsValidationService);
//         beforeEach(() => {
//           chargeEmailsService.charge.rejects(new StripeChargeError('Charge error'));
//           limitsValidationService.validate.resolves({});
//           attachSenderService = new AttachSenderService(
//             sns,
//             userId,
//             paidPlan,
//             senderId,
//             limitsValidationService,
//             fetchSenderInformationService,
//             null,
//             chargeEmailsService,
//             options
//           );
//         });

//         it('publishes an error message to updateCampaign SNS topic', (done) => {
//           attachSenderService.attachSender().then(() => {
//             expect(sns.publish.callCount).to.equal(1);
//             const payload = JSON.parse(sns.publish.lastCall.args[0].Message);
//             expect(payload).to.have.property('status', 'stripeChargeError');
//             expect(payload).to.have.property('campaignId', campaignId);
//             expect(payload).to.have.property('userId', userId);
//             expect(sns.publish.lastCall.args[0].TopicArn).to.equal('update-campaign-topic-arn');
//             done();
//           }).catch(err => done(err));
//         });

//         after(() => {
//           chargeEmailsService.charge.restore();
//           limitsValidationService.validate.restore();
//         });
//       });


//       context('when user has bad reputation', () => {
//         beforeEach(() => {
//           sinon.stub(CheckReputationService, 'validate').rejects(new BadReputation());
//           const limitsValidationService = sinon.createStubInstance(FreeLimitsValidationService);
//           limitsValidationService.validate.resolves({});
//           attachSenderService = new AttachSenderService(
//             sns,
//             userId,
//             plan,
//             senderId,
//             limitsValidationService,
//             fetchSenderInformationService,
//             CheckReputationService,
//             null,
//             options
//           );
//         });

//         it('publishes an error message to updateCampaign SNS topic', (done) => {
//           attachSenderService.attachSender().then(() => {
//             const payload = JSON.parse(sns.publish.lastCall.args[0].Message);
//             expect(payload).to.have.property('status', 'badReputation');
//             expect(payload).to.have.property('campaignId', campaignId);
//             expect(payload).to.have.property('userId', userId);
//             expect(sns.publish.lastCall.args[0].TopicArn).to.equal('update-campaign-topic-arn');
//             done();
//           }).catch(err => done(err));
//         });

//         after(() => CheckReputationService.validate.restore());
//       });
//     });

//     context('when sender is on the plan limits', () => {
//       const limitsValidationService = sinon.createStubInstance(FreeLimitsValidationService);
//       beforeEach(() => {
//         limitsValidationService.validate.rejects(new QuotaExceeded('Quota exceeded'));
//         attachSenderService = new AttachSenderService(
//           sns,
//           userId,
//           plan,
//           senderId,
//           limitsValidationService,
//           fetchSenderInformationService,
//           null,
//           null,
//           options
//         );
//       });

//       it('publishes an error message to updateCampaign SNS topic', (done) => {
//         attachSenderService.attachSender().then(() => {
//           expect(sns.publish.callCount).to.equal(1);
//           const payload = JSON.parse(sns.publish.lastCall.args[0].Message);
//           expect(payload).to.have.property('status', 'quotaExceeded');
//           expect(payload).to.have.property('campaignId', campaignId);
//           expect(payload).to.have.property('userId', userId);
//           expect(sns.publish.lastCall.args[0].TopicArn).to.equal('update-campaign-topic-arn');
//           done();
//         }).catch(err => done(err));
//       });
//       after(() => limitsValidationService.validate.restore());
//     });
//   });
//   afterEach(() => {
//     awsMock.restore('SNS');
//   });
// });
