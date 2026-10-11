import { pinoHttp } from 'pino-http';
import { logger } from '../logger/logger';
import { type Request } from 'express';
import { type IncomingMessage, type ServerResponse } from 'node:http';

export const httpLoggerMiddleware = pinoHttp({
  logger,
  customProps: (req: IncomingMessage) => {
    const expressReq = req as unknown as Request;
    return {
      requestId: expressReq.requestId,
      userId: expressReq.user?.id,
    };
  },
  serializers: {
    req: (req: IncomingMessage) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.socket?.remoteAddress,
    }),
    res: (res: ServerResponse) => ({
      statusCode: res.statusCode,
    }),
  },
});
