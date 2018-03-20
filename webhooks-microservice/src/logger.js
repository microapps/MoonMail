import winston from 'winston';
import moment from 'moment';

const logConfig = { logLevel: 'error' };
let loggerInstance = null;

const configureLogger = (event, context) => {
  logConfig.functionName = context.functionName;
  logConfig.functionVersion = context.functionVersion;
  logConfig.awsRequestId = context.awsRequestId;
  logConfig.logLevel = event.logLevel || process.env.LOG_LEVEL || 'error';
};

const logger = () => loggerInstance || buildLogger();

const buildLogger = (options) => {
  const opts = Object.assign({}, logConfig, options);
  if (process.env.NODE_ENV === 'test') {
    loggerInstance = new winston.Logger();
  } else {
    loggerInstance = new winston.Logger({
      transports: [
        new winston.transports.Console({
          level: opts.logLevel,
          handleExceptions: true,
          humanReadableUnhandledException: true,
          colorize: true,
          prettyPrint: true,
          json: false,
          timestamp: () => moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
          formatter: params => `${params.timestamp()} ${opts.awsRequestId} ${params.level.toUpperCase()}: ${(params.message ? params.message : '')}
                 ${(params.meta && Object.keys(params.meta).length ? `\n\t${JSON.stringify(params.meta)}` : '')}`
        })
      ],
      exitOnError: false
    });
  }
  return loggerInstance;
};

export default {
  configureLogger,
  logger
};
