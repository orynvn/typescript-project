import { randomUUID } from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import type { RequestContext } from '../types/request-context.type';

export type RequestWithContext = Request & {
  context?: RequestContext;
};

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const incomingId = req.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : randomUUID();

    req.context = {
      ...(req.context ?? {}),
      requestId,
    };

    res.setHeader('x-request-id', requestId);
    next();
  }
}
