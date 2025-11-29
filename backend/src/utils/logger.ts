/**
 * Production-ready logger using Winston
 * Provides structured logging with multiple transports
 */
import winston from 'winston';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(
    ({ level, message, timestamp, stack, ...meta }) => {
      let msg = `${timestamp} ${level}: ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      if (stack) {
        msg += `\n${stack}`;
      }
      return msg;
    }
  )
);

// Create transports
const transports: winston.transport[] = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: isDevelopment ? consoleFormat : logFormat,
    level: isDevelopment ? 'debug' : 'info',
  }),
];

// Add file transports in production
if (isProduction) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: {
    service: 'alyne-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: isProduction
    ? [
        new winston.transports.File({
          filename: 'logs/exceptions.log',
          format: logFormat,
        }),
      ]
    : [],
  rejectionHandlers: isProduction
    ? [
        new winston.transports.File({
          filename: 'logs/rejections.log',
          format: logFormat,
        }),
      ]
    : [],
});

// Export convenience methods
export default logger;
