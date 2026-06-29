import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

type ExceptionBody = {
  code?: number;
  message?: string | string[];
  details?: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<{ url?: string }>();
    const response = http.getResponse<unknown>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const source: ExceptionBody =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as ExceptionBody)
        : { message: typeof exceptionResponse === 'string' ? exceptionResponse : undefined };
    const message = Array.isArray(source.message)
      ? source.message.join('; ')
      : source.message ?? this.defaultMessage(status);

    this.adapterHost.httpAdapter.reply(
      response,
      {
        code: source.code ?? this.defaultCode(status),
        message,
        details: source.details,
        path: request.url ?? '',
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }

  private defaultCode(status: number) {
    if (status === HttpStatus.BAD_REQUEST) return 1001;
    if (status === HttpStatus.NOT_FOUND) return 1002;
    if (status === HttpStatus.CONFLICT) return 1003;
    if (status === HttpStatus.UNAUTHORIZED) return 2001;
    if (status === HttpStatus.FORBIDDEN) return 2002;
    return 5001;
  }

  private defaultMessage(status: number) {
    if (status === HttpStatus.UNAUTHORIZED) return '未登录或登录已失效';
    if (status === HttpStatus.FORBIDDEN) return '没有权限执行此操作';
    if (status === HttpStatus.NOT_FOUND) return '资源不存在';
    if (status === HttpStatus.BAD_REQUEST) return '请求参数错误';
    return '服务器内部错误';
  }
}
