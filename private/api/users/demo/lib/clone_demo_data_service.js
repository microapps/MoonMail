import {Campaign, EmailTemplate} from 'moonmail-models';
import * as _ from 'lodash';

export default class CloneDemoDataSevice {
  constructor(userId, demoUserId) {
    this.userId = userId;
    this.demoUserId = demoUserId;
  }

  async cloneData() {
    const clonePromises = [
      this._cloneItems(Campaign, {filters: {sentAt: {gt: 1}}}),
      this._cloneItems(EmailTemplate)
    ];
    const result = await Promise.all(clonePromises);
    return true;
  }

  async _cloneItems(model, customOptions) {
    const newItems = await this._getNewItems(model, customOptions);
    return this._doCloneItems(model, newItems);
  }

  async _getNewItems(model, customOptions = {}) {
    const lastDemoItem = await model.allBy('userId', this.demoUserId, {limit: 1});
    const options = Object.assign({}, customOptions);
    if (lastDemoItem.items && lastDemoItem.items.length === 1) {
      options.range = {gt: {id: lastDemoItem.items[0].id}};
    }
    const newItems = await model.allBy('userId', this.userId, options);
    return newItems;
  }

  _doCloneItems(model, newItems) {
    const duplicatedItems = newItems.items.map(item => {
      return Object.assign({}, item, {userId: this.demoUserId});
    });
    const itemBatches = _.chunk(duplicatedItems, 25);
    const savePromises = itemBatches.map(batch => model.saveAll(batch));
    return Promise.all(savePromises);
  }

}
