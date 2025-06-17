import { randomUUID } from 'crypto';
import type { LoggerOptions } from 'pino';

export const pinoHttpOptions: LoggerOptions & { genReqId: any } = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  redact: ['req.headers.authorization', 'req.headers.cookie'],

  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss.l' } }
      : undefined,

  genReqId: (req) => req.headers['x-request-id'] ?? randomUUID(),

  serializers: {
    req: (r: any) => {
      if (!r) return undefined;
      return {
        id: r.id,
        method: r.method,
        url: r.url,
        remoteAddress: r.socket?.remoteAddress ?? r.connection?.remoteAddress ?? r.ip ?? 'unknown',
      };
    },
    res: (res: any) => res && { statusCode: res.statusCode },
  },
};
