export default class AWSDynamoItemParamBuilder {
  awsItem: any = {};

  constructor(tableName: string) {
    this.awsItem.TableName = tableName;
  }

  withItemProperty(item: object) {
    this.awsItem.Item = item;
    return this;
  }

  private shouldGetKeysFromAwsItemObject(hashKey: string, rangeKey: string) {
    return !hashKey && !rangeKey && this.awsItem.Key;
  }

  withAttributeUpdatesProperty(params: object, hashKey?: string, rangeKey?: string) {
    const attributeUpdates = {};
    let keys = [hashKey, rangeKey]

    if (this.shouldGetKeysFromAwsItemObject(hashKey, rangeKey)) {
      keys = Object.keys(this.awsItem.Key);
    }
    for (const key in params) {
      if (!keys.includes(key)) {
        const value = params[key];
        if (value === null || value === '') {
          attributeUpdates[key] = {
            Action: 'DELETE'
          };
        } else {
          attributeUpdates[key] = {
            Action: 'PUT',
            Value: value
          };
        }
      }
    }
    this.awsItem.AttributeUpdates = attributeUpdates;

    return this;
  };

  withKeyProperty(hashKey: string, hashValue: string, rangeKey?: string, rangeValue?: string) {
    const key = {
      [hashKey]: hashValue
    };

    if (rangeKey && rangeValue) {
      key[rangeKey] = rangeValue;
    }

    this.awsItem.Key = key;

    return this
  }

  withReturnValuesProperty(returnValues: string = 'ALL_NEW') {
    this.awsItem.ReturnValues = returnValues;
    return this;
  }

  build = function () {
    return this.awsItem;
  }
}
