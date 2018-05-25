'use strict';

import { debug } from '../../../lib/index';
import { NotificationsBus } from '../../../lib/notifications_bus';
import decrypt from '../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../lib/errors';
import { User } from '../../../lib/models/user';
import { PhoneNumberUtil } from 'google-libphonenumber';
import request from 'request';

export function respond(event, cb) {
  debug('= phoneVerificationCheck.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    const phoneUtil = PhoneNumberUtil.getInstance();
    let phoneNumber;
    try {
      phoneNumber = phoneUtil.parse(event.phoneNumber);
    } catch (e) {
      return cb(ApiErrors.response({message: 'Invalid phone number', status: 403}));
    }
    const nationalNumber = phoneNumber.getNationalNumber();
    const countryCode = phoneNumber.getCountryCode();
    request({
      uri: 'https://api.authy.com/protected/json/phones/verification/check',
      qs: {
        verification_code: `${event.verificationCode}`,
        api_key: process.env.AUTHY_API_KEY,
        phone_number: nationalNumber,
        country_code: countryCode
      },
      json: true
    }, (err, res, body) => {
      if (err || res.statusCode >= 500) {
        return cb(ApiErrors.response('Service unavailable'));
      }
      if (!body.success) {
        return cb(ApiErrors.response({message: body.message, status: res.statusCode}));
      }
      const number = `+${countryCode}${nationalNumber}`;
      return User.update({phoneVerified: true, phoneNumber: number}, decoded.sub)
        .then(user => notifyAdmins(user, event.phoneNumber))
        .then(() => cb(null, {phoneVerified: true, phoneNumber: number}));
    });
  }).catch(err => cb(ApiErrors.response(err), null));
}

function notifyAdmins(user, phoneNumber) {
  const subject = `The user with phone number ${phoneNumber} has just verified it`;
  const payload = {user, phoneNumber};
  return NotificationsBus.publish('emailAdmins', payload, subject).catch(err => console.log(err));
}
