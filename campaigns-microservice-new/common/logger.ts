import errorToJSON from 'error-to-json';

export const logDebugObject = (data: {[key:string]: any}): void => {
  Object.keys(data).forEach(key => {
    logInfo(`${key}:`, data[key]);
  });
};

export const logInfo = (comment: string, data?: object): void => {
  if (process.env.DEBUG && JSON.parse(process.env.DEBUG)) {
    console.log(`${comment}:`, JSON.stringify(data, null, 2));
  }
};

export const logDebugInfo = (comment: string, data?: object): void => {
  if (process.env.DEBUG) {
    logInfo(comment, data);
  }
};

export const logError = (error: Error): void => {
  const formattedError = errorToJSON(error);
  if (error.stack) {
    formattedError.stack = error.stack.split('\n');
  }
  console.log('== ERROR ==', JSON.stringify(formattedError, null, 2));
};
