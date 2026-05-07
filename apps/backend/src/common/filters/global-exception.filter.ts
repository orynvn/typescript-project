import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { MetricsService } from '../../monitoring/metrics.service';
import type { RequestWithContext } from '../middleware/request-id.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly metricsService?: MetricsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext & Request>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] }).message ??
          'Internal server error');

    this.metricsService?.addError({
      level: statusCode >= 500 ? 'error' : 'warn',
      message: Array.isArray(message) ? message.join(', ') : message,
      route: request.url,
      stackTrace: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error: exception instanceof Error ? exception.name : 'Error',
      path: request.url,
      requestId: request.context?.requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
