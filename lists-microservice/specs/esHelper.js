import ElasticSearch from '../src/lib/elasticsearch';
import uuidv4 from 'uuid/v4';

async function deleteIndex() {
  await ElasticSearch.getClient().indices.delete({ index: process.env.ES_RECIPIENTS_INDEX_NAME, ignore_unavailable: true });
  const index = await ElasticSearch.getClient().indices.get({ index: process.env.ES_RECIPIENTS_INDEX_NAME, ignore_unavailable: true });
  if (Object.keys(index).length > 0) return await deleteIndex();
  return Promise.resolve();
}

export async function retoreEsIndices() {
  await deleteIndex();
  await ElasticSearch.getClient().indices.create({
    index: process.env.ES_RECIPIENTS_INDEX_NAME,
    body: {
      mappings: {
        [process.env.ES_RECIPIENTS_INDEX_TYPE]: {
          properties: {
            systemMetadata: {
              properties: {
                location: {
                  type: 'geo_point'
                }
              }
            },
            campaignActivity: {
              type: 'nested'
            }
          }
        }
      }
    }
  });
  console.log('[Index restored successfully]');
  return Promise.resolve();
}
