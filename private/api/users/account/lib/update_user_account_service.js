import omitEmpty from 'omit-empty';
import Joi from 'joi';
import { User } from '../../../../lib/models/user';
import { GetUserAccountService } from './get_user_account_service';

class UpdateUserAccountService {
  static updateAccount(userId, attributes) {
    const fulfilledAttrs = omitEmpty(attributes);
    return this.validateParams(fulfilledAttrs)
      .then(() => User.update(fulfilledAttrs, userId))
      .then(user => GetUserAccountService.userToAccount(userId, user));
  }

  static validateParams(attributes) {
    const validation = this.accountSchema.validate(attributes);
    if (validation.error) return Promise.reject(new Error('Invalid params'));
    else return Promise.resolve(true);
  }

  static get accountSchema() {
    return Joi.object({
      address: this.addressSchema,
      expertData: this.expertDataSchema,
      payPalEmail: Joi.string().email(),
      vat: Joi.string(),
      notifications: Joi.object(
        { isSmsOnDeliveryEnabled: Joi.boolean() }
      ).allow(null)
    });
  }

  static get addressSchema() {
    return Joi.object({
      company: Joi.string().required(),
      websiteUrl: Joi.string().required(),
      address: Joi.string().required(),
      address2: Joi.string(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required()
    });
  }

  static get expertDataSchema() {
    return Joi.object();
  }
}

module.exports.UpdateUserAccountService = UpdateUserAccountService;
