import { format, transports, type LoggerOptions } from 'winston';

export const winstonConfig: LoggerOptions = {
  level: 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [new transports.Console()],
};
