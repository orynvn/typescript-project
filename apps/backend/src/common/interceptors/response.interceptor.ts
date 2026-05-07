import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { RequestWithContext } from '../middleware/request-id.middleware';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  { success: true; message: string; requestId?: string; data: T }
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<{ success: true; message: string; requestId?: string; data: T }> {
    const request = context.switchToHttp().getRequest<RequestWithContext & Request>();
    return next.handle().pipe(
      map((data) => ({
        success: true,
        message: 'OK',
        requestId: request.context?.requestId,
        data,
      })),
    );
  }
}
