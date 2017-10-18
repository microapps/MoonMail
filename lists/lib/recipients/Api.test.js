import '../specHelper';
import Recipients from './Recipients';
import Api from './Api';
import ElasticSearch from '../elasticsearch';

describe('Recipients Api', () => {
  describe('#syncRecipientRecordWithES', () => {
    before(() => {
      sinon.stub(Recipients, 'createESRecipient').resolves(true);
      sinon.stub(Recipients, 'updateESRecipient').resolves(true);
      sinon.stub(Recipients, 'deleteESRecipient').resolves(true);
    });
    after(() => {
      Recipients.createESRecipient.restore();
      Recipients.updateESRecipient.restore();
      Recipients.deleteESRecipient.restore();
    });
    const insertEvent = {
      eventName: 'INSERT', dynamodb: { NewImage: { name: { S: 'some-name' } } }
    };
    const updateEvent = {
      eventName: 'MODIFY', dynamodb: { NewImage: { name: { S: 'some-name-2' } } }
    };
    const removeEvent = {
      eventName: 'REMOVE', dynamodb: { OldImage: { name: { S: 'some-name' } } }
    };

    context('when event is an insert', () => {
      it('it performs an update in ES', (done) => {
        Api.syncRecipientRecordWithES(insertEvent).then((result) => {
          expect(result).to.exist;
          expect(Recipients.createESRecipient).to.have.been.called;
          done();
        }).catch(error => done(error));
      });
    });

    context('when event is an update', () => {
      it('it performs an update in ES', (done) => {
        Api.syncRecipientRecordWithES(updateEvent).then((result) => {
          expect(result).to.exist;
          expect(Recipients.updateESRecipient).to.have.been.called;
          done();
        }).catch(error => done(error));
      });
    });

    context('when event is a deletion', () => {
      it('it performs a deletion in ES', (done) => {
        Api.syncRecipientRecordWithES(removeEvent).then((result) => {
          expect(result).to.exist;
          expect(Recipients.deleteESRecipient).to.have.been.called;
          done();
        }).catch(error => done(error));
      });
    });
  });
});