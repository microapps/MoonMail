import R from 'ramda';
import omitEmpty from 'omit-empty';
import moment from 'moment';

const notificationHeaderValue = R.curry((notification, header) =>
  R.pipe(
    R.path(['mail', 'headers']),
    R.find(R.propEq('name', header)),
    R.prop('value')
  )(notification));

const payloadHeadersMapping = {
  userId: 'X-Moonmail-User-ID',
  listId: 'X-Moonmail-List-ID',
  recipientId: 'X-Moonmail-Recipient-ID',
  segmentId: 'X-Moonmail-Segment-ID',
  campaignId: 'X-Moonmail-Campaign-ID'
};

const payloadNotificationMapping = {
  Complaint: { feedbackType: ['complaint', 'complaintFeedbackType'] },
  Bounce: {
    bounceType: ['bounce', 'bounceType'],
    bounceSubType: ['bounce', 'bounceSubType']
  },
  Delivery: {}
};

const notificationTypeMapping = {
  Delivery: 'email.delivered',
  Complaint: 'email.reported',
  Bounce: 'email.bounced'
};

const buildPayloadFromNotification = function buildPayloadFromNotification(sesNotification = {}) {
  const headerValue = notificationHeaderValue(sesNotification);
  const headerPayload = Object.keys(payloadHeadersMapping).reduce((acc, key) => {
    const newObj = { [key]: headerValue(payloadHeadersMapping[key]) };
    return Object.assign({}, acc, newObj);
  }, {});
  const notifycationPayload = Object.keys(payloadNotificationMapping[sesNotification.notificationType]).reduce((acc, key) => {
    const val = R.path(payloadNotificationMapping[sesNotification.notificationType][key], sesNotification);
    const newObj = { [key]: val };
    return Object.assign({}, acc, newObj);
  }, {});
  const timestamp = R.pipe(
    R.path([R.toLower(sesNotification.notificationType), 'timestamp']),
    t => moment(t).unix()
  )(sesNotification);
  return omitEmpty(Object.assign({}, headerPayload, notifycationPayload, { timestamp }));
};

const fromSesNotification = function eventFromSesNotification(sesNotification = {}) {
  const payload = buildPayloadFromNotification(sesNotification);
  return {
    type: notificationTypeMapping[sesNotification.notificationType],
    payload
  };
};

const fromLinkClick = function eventFromLinkClick({ campaignId, listId, linkId, recipientId, userId, segmentId, httpHeaders = {} }) {
  return omitEmpty({
    type: 'email.link.clicked',
    payload: {
      campaignId,
      listId,
      linkId,
      recipientId,
      userId,
      segmentId,
      metadata: httpHeaders,
      timestamp: moment().unix()
    }
  });
};

const fromEmailOpen = function fromEmailOpen({ campaignId, listId, linkId, recipientId, userId, segmentId, httpHeaders = {} }) {
  return omitEmpty({
    type: 'email.opened',
    payload: {
      campaignId,
      listId,
      linkId,
      recipientId,
      userId,
      segmentId,
      metadata: httpHeaders,
      timestamp: moment().unix()
    }
  });
};

export default {
  fromSesNotification,
  fromLinkClick,
  fromEmailOpen
};
