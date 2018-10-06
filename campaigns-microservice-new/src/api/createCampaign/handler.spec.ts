'use strict';

import respond from './handler';
import * as CampaignModel from '../../models/schema';

describe('createCampaign', () => {

  const campaign = {
    senderId: 'ca654',
    subject: 'my campaign subject',
    listIds: 'ca43546',
    name: 'my campaign',
    body: 'my campaign body'
  };

  describe('#respond()', () => {
    beforeEach(() => {
      
    });

    context('when the event is valid', () => {
      it('creates the campaign', (done) => {
        respond(event, (err, result) => {
          const args = CampaignModel.save.firstCall.args[0];
          expect(args).to.have.property('userId');
          expect(args).to.have.property('id');
          expect(err).to.not.exist;
          expect(result).to.exist;
          done();
        });
      });
    });

    context('when the event is not valid', () => {
      event = {};
      it('returns an error message', (done) => {
        respond(event, (err, result) => {
          expect(result).to.not.exist;
          expect(err).to.exist;
          done();
        });
      });
    });

    afterEach(() => {
      CampaignModel.save.restore();
    });
  });
});
