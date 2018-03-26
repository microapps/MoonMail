import '../lib/specHelper';
import ListSegments from './ListSegments';
import ListSegmentModel from './ListSegmentModel';
import Recipients from './Recipients';

describe('ListSegment', () => {
  describe('.getMembers', async () => {
    const listId = 'list-id';
    const segmentId = 'seg-id';
    const segment = {
      listId: '1',
      conditions: [
        { some: 'condition' }
      ]
    };

    before(() => {
      sinon.stub(Recipients, 'searchSubscribedByListAndConditions').withArgs(segment.listId, segment.conditions, { from: 0, size: 10 }).resolves([]);
      sinon.stub(ListSegmentModel, 'get').withArgs(listId, segmentId).resolves(segment);
    });
    after(() => {
      Recipients.searchSubscribedByListAndConditions.restore();
      ListSegmentModel.get.restore();
    });

    it('search segment members matching its conditions', async () => {
      const res = await ListSegments.getMembers(listId, segmentId, {});
      expect(res).to.deep.equals([]);
      expect(Recipients.searchSubscribedByListAndConditions).to.have.been.called;
    });
  });
});
