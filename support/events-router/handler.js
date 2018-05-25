import Api from './src/Api';

export function routeEvents(event, context, callback) {
  return Api.routeEvents(event)
    .then(res => callback(null, res))
    .catch(err => callback(err));
}
