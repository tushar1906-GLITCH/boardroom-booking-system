import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: any = 'An unexpected error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res: any = exception.getResponse();
      error = exception.name;
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = res.message || exception.message;
        error = res.error || exception.name;
        if (Array.isArray(res.message)) {
          details = res.message;
          message = 'Validation failed';
        }
      }
    } else if (typeof exception === 'object' && exception !== null) {
      const err = exception as any;
      // Handle PostgreSQL GiST exclusion violation (23P01)
      if (err.code === '23P01') {
        statusCode = HttpStatus.CONFLICT;
        error = 'Conflict';
        message = 'This room is already booked for part of the selected time.';
        details = {
          code: '23P01',
          hint: 'The requested time window overlaps with an existing confirmed reservation.',
        };
      } else {
        this.logger.error(`Unhandled Exception: ${err.message}`, err.stack);
        message = err.message || 'Internal Server Error';
      }
    }

    const payload = {
      statusCode,
      error,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(payload);
  }
}
