import '../specHelper';

import awsMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';

import Segments from '../../lib/segments/index';
import PopulateRecipientsToPrecompileEmailService from './PopulateRecipientsToPrecompileEmailService';

describe('PopulateRecipientsToPrecompileEmailService', () => {
  const campaign = {
    id: 'cj5jmono6000001qmopwgej52',
    subject: 'Test send to segments',
    body: 'H4sIAAAAAAAAA/NIzcnJ11HIgFDV1aV5xaVJxclFmUmp8aVFObW1AHlpllkhAAAA',
    senderId: 'cj39yaiq5000001qkhw1aydmo',
    precompiled: true,
    segmentId: '123'
  };
  const message = {
    sender: {
      emailAddress: 'carlos.castellanos@microapps.com',
      fromName: 'Carlos Castellanos',
      verified: true,
      id: 'cj39yaiq5000001qkhw1aydmo'
    },
    campaign,
    userId: 'google-oauth2|113373534076241986701',
    userPlan: 'enterprise'
  };

  const recipients = Array(10).fill().map((el, i) => ({
    id: i,
    listId: '1234',
    status: 'subscribed',
    email: `carlos.castellanos+${i}@microapps.com`,
    metadata: { name: 'Carlos', surname: i }
  }));

  const service = PopulateRecipientsToPrecompileEmailService.create(
    {
      eventMessage: JSON.stringify(message),
      processingOffset: 0
    }, new AWS.Lambda(),
    {
      getRemainingTimeInMillis: () => 300000
    }
  );

  describe('attaching recipients', () => {

    context('when there are more pages to fetch', () => {
      const inputState = {
        processingOffset: 0,
        processCompleted: false
      };

      before(() => {
        sinon.stub(service, 'batchSize').returns(3);
        sinon.stub(Segments, 'listSubscribedMembers').resolves({ items: recipients.slice(0, 3), total: 10 });
        sinon.stub(service, '_publishMessage').resolves(true);
        sinon.stub(service, 'updateState').resolves(true);
      });

      after(() => {
        Segments.listSubscribedMembers.restore();
        service.batchSize.restore();
        service._publishMessage.restore();
        service.updateState.restore();
      });
      it('updates internal state accordingly', (done) => {
        service.attachRecipients(inputState).then(() => {
          expect(service._publishMessage).to.have.been.calledThrice;
          expect(service.updateState.lastCall.args[0]).to.deep.equals({ processingOffset: 3, processCompleted: false });
          done();
        }).catch(err => done(err));
      });
    });

    context('when there are no more pages to fetch', () => {
      const inputState = {
        processingOffset: 9,
        processCompleted: false
      };

      before(() => {
        sinon.stub(service, 'batchSize').returns(3);
        sinon.stub(Segments, 'listSubscribedMembers').resolves({ items: recipients.slice(9, 10), total: 10 });
        sinon.stub(service, '_publishMessage').resolves(true);
        sinon.stub(service, 'updateState').resolves(true);
      });
      after(() => {
        Segments.listSubscribedMembers.restore();
        service.batchSize.restore();
        service._publishMessage.restore();
        service.updateState.restore();

      });
      it('updates internal state accordingly', (done) => {
        service.attachRecipients(inputState).then(() => {
          expect(service._publishMessage).to.have.been.calledOnce;

          expect(service.updateState.lastCall.args[0]).to.deep.equals({ processingOffset: 12, processCompleted: true });
          done();
        }).catch(err => done(err));
      });
    });
  });
});
