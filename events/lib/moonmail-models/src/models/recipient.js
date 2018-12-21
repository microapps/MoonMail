import deepAssign from 'deep-assign';
import { Model } from './model';

const statuses = {
  subscribed: 'subscribed',
  awaitingConfirmation: 'awaitingConfirmation',
  unsubscribed: 'unsubscribed',
  bounced: 'bounced',
  complaint: 'complained'
};

const subscriptionOrigins = {
  signupForm: 'signupForm',
  listImport: 'listImport',
  manual: 'manual'
};

class Recipient extends Model {

  static get tableName() {
    return process.env.RECIPIENTS_TABLE;
  }

  static get emailIndex() {
    return process.env.EMAIL_INDEX_NAME;
  }

  static get statusIndex() {
    return process.env.RECIPIENT_STATUS_INDEX_NAME;
  }

  static get globalEmailIndex() {
    return process.env.RECIPIENT_GLOBAL_EMAIL_INDEX_NAME;
  }

  static get hashKey() {
    return 'listId';
  }

  static get rangeKey() {
    return 'id';
  }

  static get statuses() {
    return statuses;
  }

  static get subscriptionOrigins() {
    return subscriptionOrigins;
  }

  static emailBeginsWith(listId, email, options = {}) {
    const indexOptions = {
      indexName: this.emailIndex,
      range: { bw: { email } }
    };
    const dbOptions = Object.assign({}, indexOptions, options);
    return this.allBy(this.hashKey, listId, dbOptions);
  }

  static allByStatus(listId, status, options = {}) {
    const indexOptions = {
      indexName: this.statusIndex,
      range: { eq: { status } }
    };
    const dbOptions = Object.assign({}, indexOptions, options);
    return this.allBy(this.hashKey, listId, dbOptions);
  }

  static allByEmail(email, options = {}) {
    const indexOptions = {
      indexName: this.globalEmailIndex,
    };
    const dbOptions = Object.assign({}, indexOptions, options);
    return this.allBy('email', email, dbOptions);
  }

  //Recursive allBy - should be redone to avoid high usage of memory
  static allByListId(key, results = [], lastIndex = null) {
    const params = {
      TableName: this.tableName,
      KeyConditionExpression: 'listId = :listId',
      FilterExpression: '#status = :status',
      ExpressionAttributeValues: {
        ':status': 'subscribed',
        ':listId': key
      },
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExclusiveStartKey: lastIndex
    };
    return this._client('query', params)
      .then((result) => {
        if (result.LastEvaluatedKey != null) {
          const newResult = [...result.Items, ...results]
          return this.allByListId(key, newResult, result.LastEvaluatedKey)
        } else {
          const newResult = [...result.Items, ...results]
          return { items: newResult }
        }
      })
  }
}

module.exports.Recipient = Recipient;
