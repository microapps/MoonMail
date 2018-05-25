const errors = {
  invalidToken: {
    message: 'Missing or invalid JWT',
    status: 401
  },
  missingParameters: {
    message: 'Missing parameters',
    status: 401
  },
  notAuthorized: {
    message: 'You are not authorized to perform this action',
    status: 403
  },
  serviceUnavailable: {
    message: 'Upstream service is unavailable',
    status: 503
  },
  InvalidToken: newError('InvalidToken', 'Missing or invalid JWT', 401),
  MissingParams: newError('MissingParams', 'Missing parameters', 401),
  NotAuthorized: newError('NotAuthorized', 'You are not authorized to perform this action', 403),
  ServiceUnavailable: newError('ServiceUnavailable', 'Upstream service is unavailable', 503)
};

export function newError(name, message, status = 500) {
  const err = new Error(message);
  err.name = name;
  err.status = status;
  Object.defineProperty(err, 'toJSON', {
    value: () => ({message, status, name}),
    configurable: true,
    writable: true
  });
  return err;
}

export default errors;
