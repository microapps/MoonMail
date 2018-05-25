import 'babel-polyfill';
import errors from './errors';

export function paramsChecker(requiredParams) {
  return (params) => new Promise((resolve, reject) => {
    const paramKeys = Object.keys(params);
    const hasAllParams = requiredParams.every(param => paramKeys.includes(param));
    return hasAllParams ? resolve(params) : reject(errors.MissingParams);
  });
}

export function errorHandler(err, customErrorNames, cb) {
  const handledErrorNames = Object.keys(errors).concat(customErrorNames);
  if (handledErrorNames.includes(err.name)) return cb(JSON.stringify(err));
  return cb(JSON.stringify(errors.ServiceUnavailable));
}
