import './lib/specHelper';
import Api from './Api';
import SegmentCommands from './SegmentCommands';

describe('SegmentCommands', () => {
  describe('#createSegment', () => {
    const segmentParams = { some: 'data' };
    const segment = { some: 'data', id: '123' };

    beforeEach(() => {
      sinon.stub(Api, 'createSegment')
        .withArgs(segmentParams)
        .resolves(segment);
    });
    afterEach(() => {
      Api.createSegment.restore();
    });

    it('creates a segments', (done) => {
      const event = { segment: segmentParams };
      SegmentCommands.createSegment(event, {}, (err, actual) => {
        expect(err).to.not.exist;
        expect(actual).to.deep.equals(segment);
        done();
      });
    });
  });

  describe('#updateSegment', () => {
    const segmentParams = { some: 'data' };
    const segment = { some: 'data', id: '123' };
    const listId = 'list-id';
    const segmentId = 'segment-id';

    beforeEach(() => {
      sinon.stub(Api, 'updateSegment')
        .withArgs(segmentParams, listId, segmentId)
        .resolves(segment);
    });
    afterEach(() => {
      Api.updateSegment.restore();
    });

    it('updates a segments', (done) => {
      const event = Object.assign({}, { segment: segmentParams }, { listId, segmentId });
      SegmentCommands.updateSegment(event, {}, (err, actual) => {
        expect(err).to.not.exist;
        expect(actual).to.deep.equals(segment);
        done();
      });
    });
  });

  describe('#deleteSegment', () => {
    const listId = 'list-id';
    const segmentId = 'segment-id';

    beforeEach(() => {
      sinon.stub(Api, 'deleteSegment')
        .withArgs(listId, segmentId)
        .resolves({});
    });
    afterEach(() => {
      Api.deleteSegment.restore();
    });

    it('deletes a segments', (done) => {
      const event = { listId, segmentId };
      SegmentCommands.deleteSegment(event, {}, (err, actual) => {
        expect(err).to.not.exist;
        done();
      });
    });
  });
});
