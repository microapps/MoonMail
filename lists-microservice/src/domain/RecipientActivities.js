import RecipientModel from './RecipientModel';
import ElasticSearch from '../lib/elasticsearch';

const indexName = process.env.ES_RECIPIENTS_INDEX_NAME;
const indexType = process.env.ES_RECIPIENTS_INDEX_TYPE;

function appendRecipientActivity({ listId, recipientId, activityType = 'campaignActivity', timestamp, campaignId, event }) {
  const recipientGlobalId = RecipientModel.buildGlobalId({ listId, recipientId });
  return ElasticSearch.getDocument(indexName, indexType, recipientGlobalId)
    .then((recipient) => {
      const existingActivity = recipient._source[activityType] || [];
      const newActivity = { event, timestamp, campaignId };
      return [...existingActivity, newActivity];
    })
    .then(campaignActivity => ElasticSearch.update(indexName, indexType, recipientGlobalId, {
      doc: { campaignActivity }
      // script: {
      //   inline: 'ctx._source.campaignActivity=params.newActivity',
      //   params: { newActivity: campaignActivity }
      // }
    }));
}

export default {
  appendRecipientActivity
};
