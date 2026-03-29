import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const end = this.metrics.httpRequestDuration.startTimer();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = ctx.getResponse<Response>();
          const route = this.normalizeRoute(req);
          const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
          };
          end(labels);
          this.metrics.httpRequestsTotal.inc(labels);
        },
        error: () => {
          const res = ctx.getResponse<Response>();
          const route = this.normalizeRoute(req);
          const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode || 500),
          };
          end(labels);
          this.metrics.httpRequestsTotal.inc(labels);
        },
      }),
    );
  }

  private normalizeRoute(req: Request): string {
    // Use the matched route pattern if available, otherwise fallback to path
    const route = (req as unknown as { route?: { path?: string } }).route
      ?.path;
    if (route) return route;

    // Normalize UUIDs and numeric IDs out of the path
    return req.path
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      .replace(/\/\d+/g, '/:id');
  }
}
