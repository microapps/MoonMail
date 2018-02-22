import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiThings from 'chai-things';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import mailcomposer from 'mailcomposer';
import { EnqueuedEmail } from './enqueued_email';
import * as sqsMessages from './sqs_receive_messages_response.json';

const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.use(chaiThings);

describe('EnqueuedEmail', () => {
  let email;
  let expectedFrom;
  const campaign = JSON.parse(sqsMessages.Messages[0].Body);

  before(() => {
    email = new EnqueuedEmail(campaign, 'some_handler');
    expectedFrom = `"${email.message.sender.fromName}" <${email.message.sender.emailAddress}>`;
  });

  describe('#toSesParams()', () => {
    it('builds SES params', (done) => {
      const sesEmail = email.toSesParams();
      expect(sesEmail).to.have.property('Source', expectedFrom);
      expect(sesEmail).to.have.deep.property('Destination.ToAddresses');
      expect(sesEmail).to.have.deep.property('Message.Body.Html.Data', email.message.campaign.body);
      expect(sesEmail).to.have.deep.property('Message.Subject.Data', email.message.campaign.subject);
      done();
    });
  });

  describe('#toSesRawParams()', () => {
    it('builds SES raw params', (done) => {
      email.toSesRawParams().then(sesRawEmail => {
        expect(sesRawEmail).to.have.deep.property('RawMessage.Data');
        done();
      }).catch(done);
    });

    it('has custom headers', (done) => {
      email.toSesRawParams().then(sesRawEmail => {
        const rawEmail = Buffer.from(sesRawEmail.RawMessage.Data, 'base64').toString();
        expect(rawEmail).to.contain(`X-Moonmail-User-ID: ${campaign.userId}`);
        expect(rawEmail).to.contain(`X-Moonmail-List-ID: ${campaign.recipient.listId}`);
        expect(rawEmail).to.contain(`X-Moonmail-Recipient-ID: ${campaign.recipient.id}`);
        expect(rawEmail).to.contain(`X-Moonmail-Campaign-ID: ${campaign.campaign.id}`);
        expect(rawEmail).to.contain(`X-Moonmail-User-ID: ${campaign.userId}`);
        expect(rawEmail).to.contain(`X-Moonmail-Segment-ID: ${campaign.campaign.segmentId}`);
        done();
      }).catch(done);
    });
  });

  describe('_buildAttachments', () => {
    it('builds the attachments attribute', (done) => {
      const email = new EnqueuedEmail(JSON.parse(sqsMessages.Messages[0].Body), 'some_handler');
      email.message.campaign.attachments = [{ name: 'att1', url: 'http://att1'}];
      expect(email._buildAttachments()).to.deep.equal([{filename: 'att1', path: 'http://att1'}]);
      done();
    });
  });

  describe('#toSentEmail()', () => {
    it('builds SentEmail params', (done) => {
      const messageId = 'my-message-id';
      const sesEmail = email.toSentEmail(messageId);
      expect(sesEmail).to.have.property('messageId', messageId);
      expect(sesEmail).to.have.property('recipientId', email.message.recipient.id);
      expect(sesEmail).to.have.property('campaignId', email.message.campaign.id);
      expect(sesEmail).to.have.property('email', email.message.recipient.email);
      expect(sesEmail).to.have.property('listId', email.message.recipient.listId);
      expect(sesEmail).to.have.property('userId', email.message.userId);
      expect(sesEmail).to.have.property('userPlan', email.message.userPlan);
      expect(sesEmail).to.have.property('status', 'sent');
      done();
    });
  });

  describe('#composeFromPart()', () => {
    it('builds the from part using fromName and emailAddress', () => {
      expect(email.composeFromPart()).to.eq(expectedFrom);
    });
  });
});
