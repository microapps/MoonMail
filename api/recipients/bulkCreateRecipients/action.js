'use strict';

import moment from 'moment';
import { Recipient } from 'moonmail-models';
import { debug } from '../../lib/logger';
import decrypt from '../../lib/auth-token-decryptor';
import base64url from 'base64-url';
import { ApiErrors } from '../../lib/errors';
import * as _ from 'lodash';

export function respond(event, cb) {
    debug('= bulkCreateRecipients.action', JSON.stringify(event));
    decrypt(event.authToken).then(decoded => {
        if (!event.listId) {
            return cb(ApiErrors.response('No listId specified'));
        }

        if (!event.recipients || _.isEmpty(event.recipients)) {
            return cb(ApiErrors.response('No recipients specified'));
        }

        if (event.recipients.length > 1000) {
            return cb(ApiErrors.response('Do not provide more than 1000 recipients'));
        }

        const incomingRecipients = [];
        event.recipients.forEach(recipient => {
            if (recipient.email && recipient.metadata) {
                const newRecipient = recipient;
                newRecipient.listId = event.listId;
                newRecipient.id = base64url.encode(recipient.email);
                newRecipient.status = Recipient.statuses.subscribed;
                newRecipient.userId = decoded.sub;
                newRecipient.createdAt = moment().unix();
                incomingRecipients.push(newRecipient);
            }
        });

        if (incomingRecipients.length === 0) {
            return cb(ApiErrors.response('No valid recipients'));
        }

        Recipient.saveAll(incomingRecipients).then(result => {
            debug('= bulkCreateRecipients.action', 'Success');
            return cb(null, result);
        }).catch(e => {
            debug('= bulkCreateRecipients.action', e);
            return cb(ApiErrors.response(e));
        });
    }).catch(err => cb(ApiErrors.response(err), null));
}
