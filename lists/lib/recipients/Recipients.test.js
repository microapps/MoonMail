import '../specHelper';
import Recipients from './Recipients';
import ElasticSearch from '../ElasticSearch';

describe('Recipients', () => {
  describe('#createInES', () => {
    const validRecipient = {
      listId: 'list-id', id: 'id', createdAt: '1496763455', email: 'a@example.com'
    };
    const invalidRecipient = { id: 'id', createdAt: '2313123123', email: 'a@example.com' };

    before(() => {
      sinon.stub(ElasticSearch, 'createOrUpdateDocument').resolves(true);
    });

    after(() => {
      ElasticSearch.createOrUpdateDocument.restore();
    });

    it('ignores invalid recipients', async () => {
      Recipients.createESRecipient('id', invalidRecipient).then(() => {
        expect(ElasticSearch.createOrUpdateDocument).not.to.have.been.called;
      });
    });

    it('processes and indexes valid recipients', async () => {
      Recipients.createESRecipient('id', validRecipient).then(() => {
        expect(ElasticSearch.createOrUpdateDocument).to.have.been.called;
      });
    });
  });
});
