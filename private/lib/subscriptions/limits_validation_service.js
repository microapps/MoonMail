import 'babel-polyfill';
import Promise from 'bluebird';
import { QuotaExceeded } from '../errors';

export default class LimitsValidationService {

  static generate(limits) {
    return currentState => new LimitsValidationService(currentState, limits);
  }

  constructor(currentState, limits) {
    this.currentState = currentState;
    this.limits = limits || {};
  }

  perform() {
    const isValid = this.isValidState();
    if (isValid) return Promise.resolve({});
    return Promise.reject(new QuotaExceeded('Quota exceeded'));
  }

  isValidState() {
    return !Object.keys(this.currentState).some(key => this.overLimits(key));
  }

  overLimits(key) {
    return !(this.currentState[key] <= (this.limits[key] || Infinity));
  }
}
