import '../lib/specHelper';
import ListModel from './ListModel';

describe('ListModel', () => {
  before(() => {
    sinon.stub(ListModel, '_client').resolves(true);
  });

  describe('#appendMetadataAttributes', () => {
    beforeEach(() => sinon.stub(ListModel, 'update'));
    afterEach(() => ListModel.update.restore());

    it('should append attribute names to metadataAttributes property', (done) => {
      const suite = [
        {
          input: [['the', 'new', 'attributes'], { list: { id: 123, userId: 456 } }],
          expected: [{ metadataAttributes: ['the', 'new', 'attributes'] }, 456, 123]
        },
        {
          input: [['the', 'new', 'attributes'], { list: { id: 123, userId: 456, metadataAttributes: ['existing', 'attributes'] } }],
          expected: [{ metadataAttributes: ['existing', 'attributes', 'the', 'new'] }, 456, 123]
        }
      ];
      const promises = suite.map(testCase => ListModel.appendMetadataAttributes(...testCase.input)
        .then(_ => expect(ListModel.update).to.have.been.calledWithExactly(...testCase.expected)));
      return Promise.all(promises).then(done());
    });

    it('should not save if attributes do not vary', (done) => {
      const testCaseInput = [['existing', 'attributes'], { list: { metadataAttributes: ['existing', 'attributes'] } }];
      ListModel.appendMetadataAttributes(...testCaseInput)
        .then((_) => {
          expect(ListModel.update).not.to.have.been.called;
          done();
        })
        .catch(done);
    });
  });

  after(() => {
    ListModel._client.restore();
  });
});
