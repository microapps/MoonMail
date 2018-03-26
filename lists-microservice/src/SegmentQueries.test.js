import './lib/specHelper';
import Api from './Api';
import SegmentQueries from './SegmentQueries';

describe('SegmentQueries', () => {
  describe('#listSegments', () => {
    const listId = 'list-id';
    const options = { some: 'option' };
    const segments = { items: [{ some: 'data', id: '123' }] };

    beforeEach(() => {
      sinon.stub(Api, 'listSegments')
        .withArgs(listId, options)
        .resolves(segments);
    });
    afterEach(() => {
      Api.listSegments.restore();
    });

    it('lists segments', (done) => {
      const event = { listId, options };
      SegmentQueries.listSegments(event, {}, (err, actual) => {
        expect(err).to.not.exist;
        expect(actual).to.deep.equals(segments);
        done();
      });
    });
  });

  describe('#listSegmentMembers', () => {
    const listId = 'list-id';
    const segmentId = 'segment-id';
    const options = { from: 0, size: 20 };
    const recipients = { items: [{ some: 'data', id: '123' }] };

    beforeEach(() => {
      sinon.stub(Api, 'getSegmentMembers')
        .withArgs(listId, segmentId, options)
        .resolves(recipients);
    });
    afterEach(() => {
      Api.getSegmentMembers.restore();
    });

    it('lists the segment members', (done) => {
      const event = { listId, segmentId, options };
      SegmentQueries.listSegmentMembers(event, {}, (err, actual) => {
        expect(err).to.not.exist;
        expect(actual).to.deep.equals(recipients);
        done();
      });
    });
  });

  describe('#getSegment', () => {
    const listId = 'list-id';
    const segmentId = 'segment-id';
    const segment = { some: 'data', id: '123' };

    beforeEach(() => {
      sinon.stub(Api, 'getSegment')
        .withArgs(listId, segmentId)
        .resolves(segment);
    });
    afterEach(() => {
      Api.getSegment.restore();
    });

    it('gets a segments', (done) => {
      const event = { listId, segmentId };
      SegmentQueries.getSegment(event, {}, (err, actual) => {
        expect(err).to.not.exist;
        expect(actual).to.deep.equals(segment);
        done();
      });
    });
  });
});
