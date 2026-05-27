import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const method = request.method;
    const url = request.url;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | string[] = 'An unexpected error occurred.';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        error = HttpStatus[statusCode] ?? 'Error';
      } else if (typeof body === 'object' && body !== null) {
        const res = body as Record<string, unknown>;
        message = (res['message'] as string | string[]) ?? exception.message;
        error = (res['error'] as string) ?? HttpStatus[statusCode] ?? 'Error';
      }

      // Expected errors — client mistakes, not bugs
      this.logger.warn(
        `${method} ${url} → ${statusCode} ${error}: ${
          Array.isArray(message) ? message.join(' | ') : message
        }`
      );
    } else {
      // Unexpected errors — our bug, log full stack trace
      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${method} ${url} → 500 Internal Server Error`, stack);
    }

    response
      .status(statusCode)
      .json({ status: 'error', statusCode, error, message });
  }
}
