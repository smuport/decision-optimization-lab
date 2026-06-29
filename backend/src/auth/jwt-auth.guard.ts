import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { AuthTokenPayload } from '@decision-lab/shared';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './auth.decorators';
import { unauthorized } from './auth.exceptions';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.bearerToken(request.headers.authorization);
    if (!token) {
      throw unauthorized();
    }

    let payload: AuthTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AuthTokenPayload>(token);
    } catch (error) {
      throw unauthorized('登录已过期，请重新登录', this.isExpired(error));
    }
    if (payload.type !== 'access' || !payload.sub || !payload.role) {
      throw unauthorized('无效的访问令牌');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE' || user.role !== payload.role) {
      throw unauthorized('账号不存在、已停用或权限已变更');
    }

    request.user = {
      id: user.id,
      email: user.email,
      studentNo: user.studentNo ?? undefined,
      name: user.name,
      role: user.role,
      status: user.status,
    };
    return true;
  }

  private bearerToken(header: string | string[] | undefined) {
    const value = Array.isArray(header) ? header[0] : header;
    const [scheme, token] = value?.split(' ') ?? [];
    return scheme === 'Bearer' && token ? token : undefined;
  }

  private isExpired(error: unknown) {
    return error instanceof Error && error.name === 'TokenExpiredError';
  }
}
