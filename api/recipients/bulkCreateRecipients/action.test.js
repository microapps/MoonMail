'use strict';

import * as chai from 'chai';
import { respond } from './action';
import * as sinon from 'sinon';
import * as sinonAsPromised from 'sinon-as-promised';
import { Recipient } from 'moonmail-models';

const expect = chai.expect;

describe('bulkCreateRecipients', () => {

  let event;

  describe('#respond()', () => {
    beforeEach(() => {
      event = {
        listId: "my-list",
        recipients: [
          {
            email: "david.garcia@microapps.com",
            metadata: {
              name: "David",
              surname: "Garcia"
            }
          },
          {
            email: "test@email.com",
            metadata: {
              name: "Gabriel",
              surname: "Robert"
            }
          }
        ]
      }

      sinon.stub(Recipient, 'saveAll').resolves('ok');
    });

    context('when the event is valid', () => {
      it('creates recipients', (done) => {
        respond(event, (err, result) => {
          expect(err).to.not.exist;
          expect(result).to.exist;
          done();
        });
      });
    });

    context('when the event is not valid', () => {
      it('returns an error message when missing listId', (done) => {
        event.listId = ''
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          const error = JSON.parse(err);
          expect(error).to.have.property('message', 'No listId specified');
          done();
        });
      });

      it('returns an error message when missing recipients', (done) => {
        event.recipients = null;
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          const error = JSON.parse(err);
          expect(error).to.have.property('message', 'No recipients specified');
          done();
        });
      });

      it('returns an error message when empty recipients', (done) => {
        event.recipients = [];
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          const error = JSON.parse(err);
          expect(error).to.have.property('message', 'No recipients specified');
          done();
        });
      });

      it('returns an error message when too much recipients', (done) => {
        for (var i = 0; i <= 25; i++) {
          event.recipients.push({})
        }
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          const error = JSON.parse(err);
          expect(error).to.have.property('message', 'Do not provide more than 25 recipients');
          done();
        });
      });

      it('returns an error message when no valid recipients', (done) => {
        event.recipients[0].email = '';
        event.recipients[1].email = '';
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          const error = JSON.parse(err);
          expect(error).to.have.property('message', 'No valid recipients');
          done();
        });
      });
    });

    afterEach(() => {
      Recipient.saveAll.restore();
    });
  });
});
