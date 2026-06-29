import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserRole } from '@decision-lab/shared';
import type { AuthenticatedRequest, CurrentUserData } from './auth.types';

export const IS_PUBLIC_KEY = 'decision-lab:is-public';
export const ROLES_KEY = 'decision-lab:roles';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserData => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error('CurrentUser used without JwtAuthGuard');
    }
    return request.user;
  },
);
