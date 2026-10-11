import pino from 'pino';

const isDev = process.env.APP_ENV === 'development' || !process.env.APP_ENV;

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
      'headers.authorization',
      'headers.cookie',
      'password',
      '*.password',
      'token',
      '*.token',
      'refreshToken',
      '*.refreshToken',
      'accessToken',
      '*.accessToken',
      'apiKey',
      '*.apiKey',
      'geminiApiKey',
      '*.geminiApiKey',
      'cookieSecret',
      'jwtSecret',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
