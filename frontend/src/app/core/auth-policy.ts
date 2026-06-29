import type { UserRole } from '@decision-lab/shared';

export function homePathForRole(role?: UserRole) {
  if (role === 'ADMIN') return '/admin/cases';
  if (role === 'TEACHER') return '/teacher';
  return '/';
}

export function canAccessRole(role: UserRole | undefined, allowedRoles: UserRole[]) {
  return Boolean(role && allowedRoles.includes(role));
}

export function canUseReturnUrl(role: UserRole, returnUrl: string) {
  if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) return false;
  if (role === 'ADMIN') return returnUrl.startsWith('/admin/');
  if (role === 'TEACHER') return returnUrl === '/teacher' || returnUrl.startsWith('/teacher/');
  return !returnUrl.startsWith('/admin/') && !returnUrl.startsWith('/teacher');
}
