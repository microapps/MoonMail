import { expect } from 'chai';
import R from 'ramda';
import Event from './Event';
import sesDelivery from './fixtures/ses_delivery';
import sesBounce from './fixtures/ses_bounce';
import sesComplaint from './fixtures/ses_complaint';

describe('Event', () => {
  describe('.fromSesNotification', () => {
    it('generates a valid event', () => {
      const notificationHeaderValue = R.curry((notification, header) =>
        R.pipe(
          R.path(['mail', 'headers']),
          R.find(R.propEq('name', header)),
          R.prop('value')
        )(notification)
      );
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
              campaignId: notificationHeaderValue(sesDelivery, 'X-Moonmail-Campaign-ID')
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
              feedbackType: R.path(['complaint', 'complaintFeedbackType'], sesComplaint)
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
              bounceSubType: R.path(['bounce', 'bounceSubType'], sesBounce)
            }
          }
        }
      ];
      testCases.forEach(({ input, out }) => expect(Event.fromSesNotification(input)).to.deep.equal(out));
    })
  });
});