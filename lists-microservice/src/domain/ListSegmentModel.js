import Joi from 'joi';
import cuid from 'cuid';
import { BaseModel } from 'moonmail-models';


const conditionTypes = {
  subscriptionOrigin: 'subscriptionOrigin',
  subscriptionDate: 'subscriptionDate'
};

export default class ListSegmentModel extends BaseModel {
  static get tableName() {
    return process.env.LIST_SEGMENTS_TABLE;
  }

  static get segmentIdIndex() {
    return process.env.LIST_SEGMENT_ID_INDEX_NAME;
  }

  static get hashKey() {
    return 'listId';
  }

  static get rangeKey() {
    return 'id';
  }

  static get conditionTypes() {
    return conditionTypes;
  }

  static get updateSchema() {
    return Joi.object({
      userId: Joi.string(),
      name: Joi.string(),
      archived: Joi.boolean(),
      conditionMatch: Joi.string().valid(['all', 'any']).default('all'),
      conditions: this.conditionsSchema
    });
  }

  static get createSchema() {
    return Joi.object({
      listId: Joi.string().required(),
      id: Joi.string().default(cuid()),
      userId: Joi.string().required(),
      name: Joi.string().required(),
      archived: Joi.boolean().default(false),
      conditionMatch: Joi.string().valid(['all', 'any']).default('all'),
      conditions: this.conditionsSchema
    });
  }

  static get conditionsSchema() {
    return Joi.array().items(Joi.alternatives().try(
      Joi.object().keys({
        conditionType: Joi.string().required().valid(['filter']),
        condition: Joi.object().keys({
          queryType: Joi.string().required(),
          fieldToQuery: Joi.string().required(),
          searchTerm: Joi.any().required()
        }),
        metadata: Joi.object()
      }),

      Joi.object().keys({
        conditionType: Joi.string().required().valid(['campaignActivity']),
        condition: Joi.object().keys({
          queryType: Joi.string().valid(['received', 'not_received', 'opened', 'not_opened', 'clicked', 'not_clicked']).required(),
          match: Joi.string().valid(['all', 'any']).default('any'),
          fieldToQuery: Joi.string().valid(['time', 'count']).default('time'),
          searchTerm: Joi.alternatives().try(Joi.object(), Joi.number()).required()
        }),
        metadata: Joi.object()
      })
    )).min(1);
  }

  static getById(segmentId) {
    const options = {
      indexName: this.segmentIdIndex,
      recursive: true
    };
    return this.allBy('id', segmentId, options)
      .then(result => result.items.pop());
  }
}
