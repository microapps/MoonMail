import './specHelper';
import wait from '../src/lib/utils/wait';
import Recipients from '../src/domain/Recipients';
import Api from '../src/Api';
import { buildRecipient } from './segmentsHelper';
import { retoreEsIndices } from './esHelper';

const getAllListRecipients = async listId => Recipients.searchSubscribedByListAndConditions(listId, [], { from: 0, size: 100 });

describe('Segments', () => {
  describe('Campaign activity based conditions', () => {
    beforeEach(async () => {
      await retoreEsIndices();
      return wait(3000);
    });

    it('finds allSubscribedRecipients who received any of the last 3 campaings', async () => {
      const userId = 'user-id';
      const listId = 'list-id';
      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 }
          ]
        },
        {
          email: 'nm2@example.com',
          userId,
          listId,
          campaignActivity: []
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 }
          ]
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c3', timestamp: 3 }
          ]
        },
        {
          email: 'm3@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm4@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];


      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(1000);

      const allSubscribedReciipents = await getAllListRecipients(listId);
      expect(allSubscribedReciipents.total).to.equals(6);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'received',
          fieldToQuery: 'count',
          searchTerm: 3,
          match: 'any'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(4);
    });

    it('finds allSubscribedRecipients who did not click some of the last 3 campaings', async () => {
      const userId = 'user-id';
      const listId = 'list-id';

      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 }
          ]
        },
        {
          email: 'nm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'opened', campaignId: 'c2', timestamp: 2 },
            { event: 'clicked', campaignId: 'c2', timestamp: 2 }
          ]
        },
        {
          email: 'nm3@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c4', timestamp: 4 },
            { event: 'opened', campaignId: 'c4', timestamp: 4 },
            { event: 'clicked', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'nm4@example.com', userId, listId, campaignActivity: []
        },
        {
          email: 'nm5@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'opened', campaignId: 'c2', timestamp: 2 },
            { event: 'clicked', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'opened', campaignId: 'c3', timestamp: 3 },
            { event: 'clicked', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 },
            { event: 'opened', campaignId: 'c4', timestamp: 4 },
            { event: 'clicked', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'opened', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'opened', campaignId: 'c3', timestamp: 3 },
            { event: 'clicked', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 },
            { event: 'opened', campaignId: 'c4', timestamp: 4 },
            { event: 'clicked', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(1000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(7);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'not_clicked',
          fieldToQuery: 'count',
          searchTerm: 3,
          match: 'any'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(2);
    });

    it('finds allSubscribedRecipients who received all of the last 3 campaings', async () => {
      const userId = 'user-id';
      const listId = 'list-id';
      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm3@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm4@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(1000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(5);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'received',
          fieldToQuery: 'count',
          searchTerm: 3,
          match: 'all'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(4);
    });

    it('finds allSubscribedRecipients who did not click any of the last 3 campaings', async () => {
      const userId = 'user-id';
      const listId = 'list-id';

      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'opened', campaignId: 'c1', timestamp: 1 },
            { event: 'clicked', campaignId: 'c1', timestamp: 1 },

            { event: 'received', campaignId: 'c2', timestamp: 2 },


            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'opened', campaignId: 'c3', timestamp: 3 },
            { event: 'clicked', campaignId: 'c3', timestamp: 3 },

            { event: 'received', campaignId: 'c4', timestamp: 4 },
            { event: 'opened', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'nm2@example.com', userId, listId, campaignActivity: []
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm3@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm4@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(1000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(6);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'not_clicked',
          fieldToQuery: 'count',
          searchTerm: 3,
          match: 'all'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(4);
    });

    it('finds allSubscribedRecipients who did not open any of the last 3 campaings', async () => {
      const userId = 'user-id';
      const listId = 'list-id';
      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'opened', campaignId: 'c1', timestamp: 1 },

            { event: 'received', campaignId: 'c2', timestamp: 2 },


            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'opened', campaignId: 'c3', timestamp: 3 },

            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'nm2@example.com', userId, listId, campaignActivity: []
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm3@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm4@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(1000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(6);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'not_opened',
          fieldToQuery: 'count',
          searchTerm: 3,
          match: 'all'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(4);
    });

    it('finds allSubscribedRecipients who did not receive any of the last 3 campaings', async () => {
      const userId = 'user-id';
      const listId = 'list-id';
      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'nm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 }
          ]
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: []
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(1000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(4);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'not_received',
          fieldToQuery: 'count',
          searchTerm: 3,
          match: 'all'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(2);
    });

    it('finds allSubscribedRecipients who did not receive any the campaigns sent in a period', async () => {
      const userId = 'user-id';
      const listId = 'list-id';
      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: []
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(1000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(3);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'not_received',
          fieldToQuery: 'time',
          searchTerm: { gte: 2 },
          match: 'all'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(2);
    });


    it('finds allSubscribedRecipients who did not open any of the campaigns sent in a period', async () => {
      const userId = 'user-id';
      const listId = 'list-id';
      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'opened', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'opened', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 },
            { event: 'opened', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'nm2@example.com',
          userId,
          listId,
          campaignActivity: []
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(1000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(3);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'not_opened',
          fieldToQuery: 'time',
          searchTerm: { gte: 2 },
          match: 'all'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(1);
    });

    it('finds allSubscribedRecipients who did not receive some of the last 3 campaings', async () => {
      const userId = 'user-id';
      const listId = 'list-id';
      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'nm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 }
          ]
        },
        {
          email: 'nm3@example.com',
          userId,
          listId: 'different-list-id',
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 }
          ]
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: []
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c3', timestamp: 3 }
          ]
        },
        {
          email: 'm3@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(5000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(5);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'not_received',
          fieldToQuery: 'count',
          searchTerm: 3,
          match: 'any'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(3);
    });

    it('finds allSubscribedRecipients who did not receive some of the campaigns sent in a period', async () => {
      const userId = 'user-id';
      const listId = 'list-id';
      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'nm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 }
          ]
        },
        {
          email: 'nm3@example.com',
          userId,
          listId: 'different-list-id',
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 }
          ]
        },
        {
          email: 'nm4@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'opened', campaignId: 'c1', timestamp: 2 }
          ]
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: []
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c3', timestamp: 3 }
          ]
        },
        {
          email: 'm3@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(5000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(6);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'not_received',
          fieldToQuery: 'time',
          searchTerm: { gte: 2 },
          match: 'any'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(3);
    });

    it('finds allSubscribedRecipients who did not open some of the campaigns sent in a period', async () => {
      const userId = 'user-id';
      const listId = 'list-id';
      const nonMatchingRecipients = [
        {
          email: 'nm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'opened', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'opened', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 },
            { event: 'opened', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'nm2@example.com',
          userId,
          listId,
          campaignActivity: []
        }
      ].map(buildRecipient);

      const matchingRecipients = [
        {
          email: 'm1@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 }
          ]
        },
        {
          email: 'm2@example.com',
          userId,
          listId,
          campaignActivity: [
            { event: 'received', campaignId: 'c1', timestamp: 1 },
            { event: 'received', campaignId: 'c2', timestamp: 2 },
            { event: 'received', campaignId: 'c3', timestamp: 3 },
            { event: 'opened', campaignId: 'c3', timestamp: 3 },
            { event: 'received', campaignId: 'c4', timestamp: 4 },
            { event: 'opened', campaignId: 'c4', timestamp: 4 }
          ]
        }
      ].map(buildRecipient);

      const allRecipients = [...matchingRecipients, ...nonMatchingRecipients];

      await Promise.map(allRecipients, recipient => Api.createRecipientEs(recipient), { concurrency: 1 });

      await wait(1000);

      const allSubscribedRecipients = await getAllListRecipients(listId);
      expect(allSubscribedRecipients.total).to.equals(4);

      const resultingRecipients = await Recipients.searchSubscribedByListAndConditions(listId, [{
        conditionType: 'campaignActivity',
        condition: {
          queryType: 'not_opened',
          fieldToQuery: 'time',
          searchTerm: { gte: 2 },
          match: 'any'
        }
      }], {});

      expect(resultingRecipients.items).to.have.deep.members(matchingRecipients);
      expect(resultingRecipients.total).to.equals(2);
    });
  });
});
