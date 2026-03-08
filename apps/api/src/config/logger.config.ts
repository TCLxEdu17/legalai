import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack, context }) => {
  const ctx = context ? `[${context}] ` : '';
  return `${timestamp} ${level}: ${ctx}${stack || message}`;
});

// Em produção usa JSON estruturado — melhor para Render/Datadog/qualquer log aggregator
const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  winston.format.json(),
);

const isDev = process.env.NODE_ENV !== 'production';

export const winstonConfig: winston.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: isDev
    ? combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), colorize(), devFormat)
    : prodFormat,
  transports: [
    new winston.transports.Console(),
    // Arquivo só quando LOG_TO_FILE=true (não usar no Render — FS efêmero)
    ...(process.env.LOG_TO_FILE === 'true'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
};
