import '../lib/specHelper';

import ListSegmentModel from './ListSegmentModel';

describe('ListSegmentModel', () => {
  const tableName = 'list_segments-table';
  const hashKey = 'listId';
  const rangeKey = 'id';
  let tNameStub;

  beforeEach(() => {
    sinon.stub(ListSegmentModel, '_client').resolves(true);
  });

  describe('.hashKey', () => {
    it('returns the hash key name', () => {
      expect(ListSegmentModel.hashKey).to.equal(hashKey);
    });
  });

  describe('.rangeKey', () => {
    it('returns the range key name', () => {
      expect(ListSegmentModel.rangeKey).to.equal(rangeKey);
    });
  });

  describe('.create', () => {
    context('when the item is not valid', () => {
      it('rejects and returns', (done) => {
        ListSegmentModel.create({ listId: '1' }).catch((err) => {
          expect(err).to.exist;
          expect(ListSegmentModel._client).not.to.have.been.called;
          done();
        }).catch(done);
      });
    });
    context('when the item is valid', () => {
      it('saves the item', (done) => {
        ListSegmentModel.create({
          listId: '1',
          name: 'some-name',
          userId: 'user-id',
          conditionMatch: 'any',
          conditions: [
            {
              conditionType: 'filter',
              condition: {
                queryType: 'range',
                fieldToQuery: 'age',
                searchTerm: { gte: 29, lt: 50 }
              }
            }
          ]
        }).then(() => {
          expect(ListSegmentModel._client).to.have.been.called;
          done();
        }).catch(done);
      });
    });
  });

  describe('.update', () => {
    context('when the conditions are invalid', () => {
      it('rejects and returns', (done) => {
        ListSegmentModel.update({ conditions: [] }, hashKey, rangeKey).catch((err) => {
          expect(err).to.exist;
          expect(ListSegmentModel._client).not.to.have.been.called;
          done();
        }).catch(done);
      });
    });
    context('when the conditions are valid', () => {
      it('performs the update', (done) => {
        ListSegmentModel.update({
          conditions: [
            {
              conditionType: 'filter',
              condition: {
                queryType: 'range',
                fieldToQuery: 'age',
                searchTerm: { gte: 29, lt: 50 }
              }
            }
          ]
        }, hashKey, rangeKey).then(() => {
          expect(ListSegmentModel._client).to.have.been.called;
          done();
        }).catch(done);
      });
    });
  });

  describe('conditions', () => {
    it('successfully validate cases', async () => {
      const cases = [
        {
          input: {
            listId: '1',
            name: 'some-name',
            userId: 'user-id',
            conditionMatch: 'any',
            conditions: [
              {
                conditionType: 'filter',
                condition: {
                  queryType: 'range',
                  fieldToQuery: 'age',
                  searchTerm: { gte: 29, lt: 50 }
                }
              }
            ]
          },
          expected: true
        },
        {
          input: {
            listId: '1',
            name: 'some-name',
            userId: 'user-id',
            conditionMatch: 'all',
            conditions: [
              {
                conditionType: 'filter',
                condition: {
                  queryType: 'match',
                  fieldToQuery: 'country',
                  searchTerm: 'ES'
                }
              }
            ]
          },
          expected: true
        },
        {
          input: {
            listId: '1',
            name: 'some-name',
            userId: 'user-id',
            conditionMatch: 'all',
            conditions: [
              {
                conditionType: 'filter',
                condition: {
                  queryType: 'match',
                  fieldToQuery: 'country'
                }
              }
            ]
          },
          expected: false
        },
        {
          input: {
            listId: '1',
            name: 'some-name',
            userId: 'user-id',
            conditionMatch: 'all',
            conditions: [
              {
                conditionType: 'campaignActivity',
                condition: {
                  queryType: 'received',
                  fieldToQuery: 'time',
                  searchTerm: { gte: 'now-30d/d' },
                  match: 'all'
                }
              }
            ]
          },
          expected: true
        },
        {
          input: {
            listId: '1',
            name: 'some-name',
            userId: 'user-id',
            conditionMatch: 'all',
            conditions: [
              {
                conditionType: 'campaignActivity',
                condition: {
                  queryType: 'received',
                  fieldToQuery: 'count',
                  searchTerm: 5,
                  match: 'all'
                }
              },
              {
                conditionType: 'filter',
                condition: {
                  queryType: 'match',
                  fieldToQuery: 'country',
                  searchTerm: 'ES'
                }
              }
            ]
          },
          expected: true
        },
        {
          input: {
            listId: '1',
            name: 'some-name',
            userId: 'user-id',
            conditionMatch: 'all',
            conditions: [
              {
                conditionType: 'campaignActivity',
                condition: {
                  queryType: 'received',
                  fieldToQuery: 'count',
                  searchTerm: 5,
                  match: 'all'
                }
              },
              {
                conditionType: 'filter',
                condition: {
                  queryType: 'match',
                  fieldToQuery: 'country'
                }
              }
            ]
          },
          expected: false
        },
        {
          input: {
            listId: '1',
            name: 'some-name',
            userId: 'user-id',
            conditionMatch: 'all',
            conditions: [
              {
                conditionType: 'campaignActivity',
                condition: {
                  queryType: 'received',
                  fieldToQuery: 'count'
                }
              }
            ]
          },
          expected: false
        },
        {
          input: {
            listId: '1',
            name: 'some-name',
            userId: 'user-id',
            conditionMatch: 'all',
            conditions: [
              {
                conditionType: 'campaignActivity2',
                condition: {
                  queryType: 'received',
                  fieldToQuery: 'count'
                }
              }
            ]
          },
          expected: false
        }
      ];
      cases.forEach((c) => {
        if (c.expected) {
          expect(ListSegmentModel.validate(ListSegmentModel.createSchema, c.input).error).not.to.exist;
        } else {
          expect(ListSegmentModel.validate(ListSegmentModel.createSchema, c.input).error).to.exist;
        }
      });
    });
  });

  afterEach(() => {
    ListSegmentModel._client.restore();
  });
});
