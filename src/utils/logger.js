// src/utils/logger.js
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'YakoGuardian' },
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
    // Always log to console so PM2 shows startup/Mongo status in production
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, stack }) => {
          return stack
            ? `${level}: ${message} ${JSON.stringify({ service: 'YakoGuardian', stack, timestamp })}`
            : `${level}: ${message} ${JSON.stringify({ service: 'YakoGuardian', timestamp })}`;
        })
      )
    })
  ]
});

module.exports = logger;
