import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

const SENSITIVE_FIELDS = ['password', 'passwordHash', 'token', 'refreshToken', 'secret', 'apiKey'];

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) sanitized[field] = '[REDACTED]';
  }
  return sanitized;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, body } = request;
    const userId: string | undefined = request.user?.id;
    const now = Date.now();

    const userTag = userId ? ` user=${userId}` : '';
    const bodyLog =
      method !== 'GET' && body && Object.keys(body).length
        ? ` body=${JSON.stringify(sanitizeBody(body)).slice(0, 200)}`
        : '';

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = context.switchToHttp().getResponse();
        const elapsed = Date.now() - now;
        this.logger.log(`${method} ${url} ${statusCode} ${elapsed}ms${userTag} ip=${ip}`);
      }),
      catchError((error) => {
        const elapsed = Date.now() - now;
        const status = error?.status ?? 500;
        this.logger.error(
          `${method} ${url} ${status} ${elapsed}ms${userTag} ip=${ip}${bodyLog}`,
          error?.stack || String(error),
        );
        return throwError(() => error);
      }),
    );
  }
}
