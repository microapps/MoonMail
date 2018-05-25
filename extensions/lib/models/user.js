import { Model } from 'moonmail-models';

class User extends Model {
  static get tableName() {
    return process.env.USERS_TABLE;
  }

  static get hashKey() {
    return 'id';
  }
}

module.exports.User = User;
