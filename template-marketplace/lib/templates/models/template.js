import Joi from 'joi';
import { Model } from 'moonmail-models';

export default class Template extends Model {

  static get tableName() {
    return process.env.TEMPLATES_TABLE;
  }

  static get hashKey() {
    return 'id';
  }

  static get schema() {
    return Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      userId: Joi.string(),
      description: Joi.string(),
      body: Joi.string(),
      html: Joi.string(),
      price: Joi.number(),
      categories: Joi.array(),
      thumbnail: Joi.string(),
      images: Joi.array().items(Joi.string()),
      tags: Joi.array().items(Joi.string()),
      archived: Joi.boolean().default(false),
      approved: Joi.boolean().default(false),
      designer: Joi.object({
        name: Joi.string(),
        url: Joi.string(),
        email: Joi.string().email()
      })
    });
  }

  static save(item) {
    if (this.isValid(item, { allowUnknown: true })) return super.save(item);
    return Promise.reject(new Error('TemplateValidationError'));
  }

  static update(params, hash) {
    return this.get(hash).then((item) => {
      if (this.isValid(Object.assign({}, item, params), { allowUnknown: true })) return super.update(params, hash);
      return Promise.reject(new Error('TemplateValidationError'));
    });
  }
}
