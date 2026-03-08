import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) sanitized[field] = '[REDACTED]';
  }
  return sanitized;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno do servidor';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
    };

    // Contexto enriquecido para diagnóstico
    const userId = (request as any).user?.id;
    const userTag = userId ? ` | user=${userId}` : '';
    const body = request.body && Object.keys(request.body).length
      ? ` | body=${JSON.stringify(sanitizeBody(request.body)).slice(0, 300)}`
      : '';
    const query = request.query && Object.keys(request.query).length
      ? ` | query=${JSON.stringify(request.query)}`
      : '';

    const prefix = `${request.method} ${request.url} → ${status}${userTag}${query}${body}`;

    if (status >= 500) {
      this.logger.error(
        prefix,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= 400) {
      this.logger.warn(`${prefix} | ${JSON.stringify(message)}`);
    }

    response.status(status).json(errorResponse);
  }
}
