import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@decision-lab/shared';
import { ROLES_KEY } from './auth.decorators';
import { forbidden } from './auth.exceptions';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const declaredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = declaredRoles ?? this.rolesForPath(request.url);
    if (!roles?.length) {
      return true;
    }

    const user = request.user;
    if (!user || !roles.includes(user.role)) {
      throw forbidden('当前角色无权访问此接口', 'ROLE_ACCESS_DENIED');
    }
    return true;
  }

  private rolesForPath(url?: string): UserRole[] | undefined {
    const path = url?.split('?')[0] ?? '';
    if (path.startsWith('/api/v1/admin/')) return ['ADMIN'];
    if (path.startsWith('/api/v1/teacher/')) return ['TEACHER'];
    if (path.startsWith('/api/v1/me/')) return ['STUDENT'];
    return undefined;
  }
}
