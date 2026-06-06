import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((result) => {
        // Jika controller sudah return { message, data }, gunakan itu
        if (result && typeof result === 'object' && 'message' in result) {
          const { message, data, ...rest } = result as any;
          return {
            success: true,
            statusCode,
            message: message ?? 'Berhasil',
            ...(data !== undefined ? { data } : rest),
          };
        }

        return {
          success: true,
          statusCode,
          message: 'Berhasil',
          data: result,
        };
      }),
    );
  }
}
