import { Model } from 'moonmail-models';

class PaymentLog extends Model {

  static get tableName() {
    return process.env.PAYMENT_LOG_TABLE;
  }

  static get refferedOfIndex() {
    return process.env.PAYMENT_LOG_REFFERED_OF_INDEX;
  }

  static get hashKey() {
    return 'id';
  }
}

module.exports.PaymentLog = PaymentLog; 