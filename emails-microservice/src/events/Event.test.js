import chai from 'chai';
import sinon from 'sinon';
import R from 'ramda';
import moment from 'moment';
import Event from './Event';
import sesDelivery from './fixtures/ses_delivery.json';
import sesBounce from './fixtures/ses_bounce.json';
import sesComplaint from './fixtures/ses_complaint.json';

const { expect } = chai;

describe('Event', () => {
  describe('.fromSesNotification', () => {
    const notificationHeaderValue = R.curry((notification, header) =>
      R.pipe(
        R.path(['mail', 'headers']),
        R.find(R.propEq('name', header)),
        R.prop('value')
      )(notification));
    const testCases = [
      {
        input: sesDelivery,
        out: {
          type: 'email.delivered',
          payload: {
            userId: notificationHeaderValue(sesDelivery, 'X-Moonmail-User-ID'),
            listId: notificationHeaderValue(sesDelivery, 'X-Moonmail-List-ID'),
            recipientId: notificationHeaderValue(sesDelivery, 'X-Moonmail-Recipient-ID'),
            segmentId: notificationHeaderValue(sesDelivery, 'X-Moonmail-Segment-ID'),
            campaignId: notificationHeaderValue(sesDelivery, 'X-Moonmail-Campaign-ID'),
            timestamp: moment(sesDelivery.delivery.timestamp).unix()
          }
        }
      },
      {
        input: sesComplaint,
        out: {
          type: 'email.reported',
          payload: {
            userId: notificationHeaderValue(sesComplaint, 'X-Moonmail-User-ID'),
            listId: notificationHeaderValue(sesComplaint, 'X-Moonmail-List-ID'),
            recipientId: notificationHeaderValue(sesComplaint, 'X-Moonmail-Recipient-ID'),
            segmentId: notificationHeaderValue(sesComplaint, 'X-Moonmail-Segment-ID'),
            campaignId: notificationHeaderValue(sesComplaint, 'X-Moonmail-Campaign-ID'),
            feedbackType: R.path(['complaint', 'complaintFeedbackType'], sesComplaint),
            timestamp: moment(sesComplaint.complaint.timestamp).unix()
          }
        }
      },
      {
        input: sesBounce,
        out: {
          type: 'email.bounced',
          payload: {
            userId: notificationHeaderValue(sesBounce, 'X-Moonmail-User-ID'),
            listId: notificationHeaderValue(sesBounce, 'X-Moonmail-List-ID'),
            recipientId: notificationHeaderValue(sesBounce, 'X-Moonmail-Recipient-ID'),
            segmentId: notificationHeaderValue(sesBounce, 'X-Moonmail-Segment-ID'),
            campaignId: notificationHeaderValue(sesBounce, 'X-Moonmail-Campaign-ID'),
            bounceType: R.path(['bounce', 'bounceType'], sesBounce),
            bounceSubType: R.path(['bounce', 'bounceSubType'], sesBounce),
            timestamp: moment(sesBounce.bounce.timestamp).unix()
          }
        }
      }
    ];

    it('generates a valid event', () => {
      testCases.forEach(({ input, out }) => expect(Event.fromSesNotification(input)).to.deep.equal(out));
    });
  });

  describe('.fromLinkClick', () => {
    const campaignId = 'campaign-id';
    const linkId = 'link-id';
    const listId = 'list-id';
    const recipientId = 'recipient-id';
    const userId = 'user-id';
    const segmentId = 'segment-id';
    const httpHeaders = { Host: 'localhost', 'User-Agent': 'Firefox' };
    const timestamp = 56789;

    const testCases = [
      {
        input: { campaignId, listId, linkId, recipientId, userId, segmentId, httpHeaders },
        out: {
          type: 'email.link.clicked',
          payload: { campaignId, listId, linkId, recipientId, userId, segmentId, timestamp, metadata: httpHeaders }
        }
      },
      {
        input: { campaignId, listId, linkId, recipientId, userId, httpHeaders },
        out: {
          type: 'email.link.clicked',
          payload: { campaignId, listId, linkId, recipientId, userId, timestamp, metadata: httpHeaders }
        }
      },
      {
        input: { campaignId, listId, linkId, recipientId, userId },
        out: {
          type: 'email.link.clicked',
          payload: { campaignId, listId, linkId, recipientId, userId, timestamp }
        }
      }
    ];

    before(() => sinon.stub(moment.fn, 'unix').returns(timestamp));
    after(() => moment.fn.unix.restore());

    it('generates a valid event', () => {
      testCases.forEach(({ input, out }) => expect(Event.fromLinkClick(input)).to.deep.equal(out));
    });
  });

  describe('.fromEmailOpen', () => {
    const campaignId = 'campaign-id';
    const linkId = 'link-id';
    const listId = 'list-id';
    const recipientId = 'recipient-id';
    const userId = 'user-id';
    const segmentId = 'segment-id';
    const httpHeaders = { Host: 'localhost', 'User-Agent': 'Firefox' };
    const timestamp = 56789;

    const testCases = [
      {
        input: { campaignId, listId, linkId, recipientId, userId, segmentId, httpHeaders },
        out: {
          type: 'email.opened',
          payload: { campaignId, listId, linkId, recipientId, userId, segmentId, timestamp, metadata: httpHeaders }
        }
      },
      {
        input: { campaignId, listId, linkId, recipientId, userId, httpHeaders },
        out: {
          type: 'email.opened',
          payload: { campaignId, listId, linkId, recipientId, userId, timestamp, metadata: httpHeaders }
        }
      },
      {
        input: { campaignId, listId, linkId, recipientId, userId },
        out: {
          type: 'email.opened',
          payload: { campaignId, listId, linkId, recipientId, userId, timestamp }
        }
      }
    ];

    before(() => sinon.stub(moment.fn, 'unix').returns(timestamp));
    after(() => moment.fn.unix.restore());

    it('generates a valid event', () => {
      testCases.forEach(({ input, out }) => expect(Event.fromEmailOpen(input)).to.deep.equal(out));
    });
  });
});
