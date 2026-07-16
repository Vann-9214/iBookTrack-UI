/**
 * utils/logger.js
 *
 * Structured logger utility.
 * Overrides native console methods to output JSON-formatted logs with timestamps
 * and log levels.
 */

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

const formatMessage = (level, args) => {
  const logObject = {
    timestamp: new Date().toISOString(),
    level: level,
  };
  
  if (args.length === 1) {
    if (args[0] instanceof Error) {
      logObject.message = args[0].message;
      logObject.stack = args[0].stack;
    } else {
      logObject.message = args[0];
    }
  } else if (args.length > 1) {
    logObject.message = args[0];
    const meta = args.slice(1);
    const errorObj = meta.find(arg => arg instanceof Error);
    if (errorObj) {
        logObject.error = errorObj.message;
        logObject.stack = errorObj.stack;
        logObject.meta = meta.filter(arg => !(arg instanceof Error));
    } else {
        logObject.meta = meta;
    }
  } else {
    logObject.message = '';
  }

  return JSON.stringify(logObject);
};

export const initializeLogger = () => {
  console.log = (...args) => originalConsole.log(formatMessage('INFO', args));
  console.info = (...args) => originalConsole.info(formatMessage('INFO', args));
  console.warn = (...args) => originalConsole.warn(formatMessage('WARN', args));
  console.error = (...args) => originalConsole.error(formatMessage('ERROR', args));
  console.debug = (...args) => originalConsole.debug(formatMessage('DEBUG', args));
};

export const logger = {
  info: (...args) => originalConsole.log(formatMessage('INFO', args)),
  warn: (...args) => originalConsole.warn(formatMessage('WARN', args)),
  error: (...args) => originalConsole.error(formatMessage('ERROR', args)),
  debug: (...args) => originalConsole.debug(formatMessage('DEBUG', args))
};
