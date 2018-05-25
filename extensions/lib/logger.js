import winston from 'winston';
import moment from 'moment';

const logConfig = { logLevel: 'error' };
let logger = null;

module.exports.configureLogger = (event, context) => {
  logConfig.functionName = context.functionName;
  logConfig.functionVersion = context.functionVersion;
  logConfig.awsRequestId = context.awsRequestId;
  logConfig.logLevel = event.logLevel || process.env.LOG_LEVEL || 'error';
};

module.exports.logger = () => logger || buildLogger();

const buildLogger = (options = {}) => {
  const opts = Object.assign({}, logConfig, options);
  if (process.env.NODE_ENV === 'test') {
    logger = new winston.Logger();
  } else {
    logger = new winston.Logger({
      transports: [
        new winston.transports.Console({
          level: opts.logLevel,
          handleExceptions: true,
          humanReadableUnhandledException: true,
          colorize: true,
          prettyPrint: true,
          json: false,
          timestamp: () => moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
          formatter: options => `${options.timestamp()} ${opts.awsRequestId} ${options.level.toUpperCase()}: ${(options.message ? options.message : '')}
                 ${(options.meta && Object.keys(options.meta).length ? `\n\t${JSON.stringify(options.meta)}` : '')}`
        })
      ],
      exitOnError: false
    });
  }
  return logger;
};

module.exports.debug = function () {
  if (process.env.DEBUG) {
    console.log.apply(console, arguments);
  }
};
