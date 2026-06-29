import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

export function unauthorized(message = '未登录或登录已失效', expired = false) {
  return new UnauthorizedException({
    code: expired ? 2003 : 2001,
    message,
    details: expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
  });
}

export function forbidden(message = '没有权限执行此操作', details = 'FORBIDDEN') {
  return new ForbiddenException({
    code: 2002,
    message,
    details,
  });
}
