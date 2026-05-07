import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from '../../monitoring/metrics.service';
import type { RequestWithContext } from '../middleware/request-id.middleware';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<{ statusCode: number }>();

    this.metricsService.onRequestStart();
    const startedAt = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const route = request.route?.path ?? request.path ?? request.url;
        this.metricsService.onRequestEnd({
          method: request.method,
          route,
          status: response.statusCode,
          durationMs: Date.now() - startedAt,
        });
      }),
    );
  }
}
