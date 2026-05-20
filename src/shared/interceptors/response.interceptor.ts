import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface SuccessResponse<T> {
  status: 'success';
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        status: 'success' as const,
        data,
      }))
    );
  }
}
