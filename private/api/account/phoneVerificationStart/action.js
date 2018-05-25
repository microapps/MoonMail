'use strict';

import { debug } from '../../../lib/index';
import decrypt from '../../../lib/auth-token-decryptor';
import { ApiErrors } from '../../../lib/errors';
import { PhoneNumberUtil } from 'google-libphonenumber';
import request from 'request';
import { User } from '../../../lib/models/user';

export function respond(event, cb) {
  debug('= phoneVerificationStart.action', JSON.stringify(event));
  decrypt(event.authToken).then(decoded => {
    const phoneUtil = PhoneNumberUtil.getInstance();
    let phoneNumber;
    try {
      phoneNumber = phoneUtil.parse(event.phoneNumber);
    } catch (e) {
      return cb({ message: 'Invalid phone number', status: 403 });
    }
    const nationalNumber = phoneNumber.getNationalNumber();
    const countryCode = phoneNumber.getCountryCode();
    const number = `+${countryCode}${nationalNumber}`;
    return User.checkPhoneUnique(number)
      .then(() => {
        request({
          uri: 'https://api.authy.com/protected/json/phones/verification/start',
          qs: { api_key: process.env.AUTHY_API_KEY },
          method: 'POST',
          json: {
            phone_number: nationalNumber.toString(),
            country_code: countryCode,
            via: 'sms'
          }
        }, (err, res, body) => {
          if (err || res.statusCode !== 200) {
            return cb(ApiErrors.response('Service unavailable'));
          }
          return cb(null, {success: true});
        });
      });
  }).catch(err => cb(ApiErrors.response(err), null));
}

