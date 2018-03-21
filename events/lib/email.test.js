import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { Email } from './email';

const { expect } = chai;
chai.use(chaiAsPromised);

describe('Email', () => {
  const apiHost = 'myapi.com';
  const unsubscribeApiHost = 'myunsubscribeapi.com';
  const metadata = {
    name: 'John',
    surname: 'Doe'
  };
  const bodyTemplate = 'Hi {{ name }} {{ surname }}, this email is for you!';
  const bodyNoTags = 'Hey you, check this out';
  const bodyParsed = `Hi ${metadata.name} ${metadata.surname}, this email is for you!`;
  const bodyUnsubscribe = 'Hi {{ name }} {{ surname }}, this email is for you!{{ unsubscribe_url }}';
  const subjectTemplate = 'Hi {{ name }}!';
  const subjectNoTags = 'Hey you!';
  const subjectParsed = `Hi ${metadata.name}!`;
  const emailParams = {
    fromEmail: 'myemail@test.com',
    to: 'somerecipient@test.com',
    metadata
  };
  const recipientId = 'recipient-id';
  const listId = 'list-id';
  const campaignId = 'campaign-id';
  const emailWithTagsParams = Object.assign({ body: bodyTemplate, subject: subjectTemplate, recipientId, listId, campaignId }, emailParams);
  const emailUnsubscribeParams = Object.assign({ body: bodyUnsubscribe, subject: subjectTemplate, recipientId, listId, campaignId }, emailParams);
  const emailNoTagsParams = Object.assign({ body: bodyNoTags, subject: subjectNoTags, recipientId, listId, campaignId }, emailParams);
  const footer = '<p>some footer</p>';

  before(() => {
    process.env.API_HOST = apiHost;
    process.env.UNSUBSCRIBE_API_HOST = unsubscribeApiHost;
  });
  after(() => {
    delete process.env.API_HOST;
    delete process.env.UNSUBSCRIBE_API_HOST;
  });

  describe('#renderBody()', () => {
    context('when the body contains liquid tags', () => {
      it('returns the body with parsed liquid tags', (done) => {
        const emailWithTags = new Email(emailWithTagsParams, { footer: false });
        expect(emailWithTags.renderBody()).to.eventually.equal(bodyParsed).notify(done);
      });
    });
    context('when the body does not contain liquid tags', () => {
      it('returns the body unmodified', (done) => {
        const emailNoTags = new Email(emailNoTagsParams, { footer: false });
        expect(emailNoTags.renderBody()).to.eventually.equal(bodyNoTags).notify(done);
      });
    });
    context('when the footer option is passed', () => {
      const emailWithFooter = new Email(emailNoTagsParams, { footer: true });
      before(() => sinon.stub(emailWithFooter, '_buildFooter').returns(footer));
      after(() => emailWithFooter._buildFooter.restore());

      it('appends the footer', done => {
        expect(emailWithFooter.renderBody()).to.eventually.contain(footer).notify(done);
      });
    });
    context('when the body contains unsubscribeUrl tag', () => {
      it('should reder the unsubscribe url', done => {
        const emailWithTags = new Email(emailWithTagsParams, { footer: false });
        const emailUnsubscribe = new Email(emailUnsubscribeParams, { footer: false });
        const unsubscribeUrl = emailWithTags._buildUnsubscribeUrl();
        expect(emailUnsubscribe.renderBody()).to.eventually.contain(unsubscribeUrl).notify(done);
      });
    });
  });

  describe('#_buildUnsubscribeUrl()', () => {
    it('returns the unsubscribe url for a specific recipient', done => {
      const emailWithTags = new Email(emailWithTagsParams, { footer: false });
      const url = `https://${unsubscribeApiHost}/lists/${emailWithTags.listId}/recipients/${emailWithTags.recipientId}/unsubscribe?cid=${campaignId}`;
      expect(emailWithTags._buildUnsubscribeUrl()).to.equal(url);
      done();
    });
  });

  describe('#renderSubject()', () => {
    context('when the subject contains liquid tags', () => {
      it('returns the subject with parsed liquid tags', (done) => {
        const emailWithTags = new Email(emailWithTagsParams, { footer: false });
        expect(emailWithTags.renderSubject()).to.eventually.equal(subjectParsed).notify(done);
      });
    });
    context('when the subject does not contain liquid tags', () => {
      it('returns the subject unmodified', (done) => {
        const emailNoTags = new Email(emailNoTagsParams, { footer: false });
        expect(emailNoTags.renderSubject()).to.eventually.equal(subjectNoTags).notify(done);
      });
    });
  });

  describe('#appendOpensPixel()', () => {
    it('appends the opens tracking image', (done) => {
      const emailWithTags = new Email(emailWithTagsParams, { footer: false });
      const opensTrackingUrl = `https://${apiHost}/links/open/${campaignId}?r=${recipientId}&l=${listId}`;
      const imgTrackingTag = `<img src="${opensTrackingUrl}" width="1" height="1" />`;
      expect(emailWithTags.appendOpensPixel(bodyTemplate)).to.eventually.contain(imgTrackingTag).notify(done);
    });
  });
});
