import omitEmpty from 'omit-empty';
import { Model } from 'moonmail-models';

class Expert extends Model {

  static get tableName() {
    return process.env.EXPERTS_TABLE;
  }

  static get typeCountryIndex() {
    return process.env.EXPERTS_TYPE_COUNTRY_INDEX;
  }

  static get hashKey() {
    return 'userId';
  }

  static allByTypeAndCountry(expertType, options) {
    const { country, type, ...restOptions } = options;
    const indexParams = {
      indexName: this.typeCountryIndex,
      range: { eq: { country } }
    };
    const preparedOptions = omitEmpty(Object.assign({}, indexParams, restOptions));

    // A hack to always send country parameter
    // as a workaraound to mm-models bug.
    if (!preparedOptions.range) {
      preparedOptions.range = { ge: { country: '0' }};
    }
    //
    return this.allBy('expertType', expertType, preparedOptions);
  }
}

module.exports.Expert = Expert;