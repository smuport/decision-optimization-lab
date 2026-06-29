import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { SubmissionCreateRequestSchema, type AuthTokenPayload } from '@decision-lab/shared';
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { SectionAccessService } from '../src/auth/section-access.service';

const activeStudent = {
  id: 'student-1',
  email: 'student@example.com',
  studentNo: 'S001',
  name: 'Student',
  role: 'STUDENT' as const,
  status: 'ACTIVE' as const,
  passwordHash: '',
};

test('auth service verifies password and signs trusted access claims', async () => {
  const user = { ...activeStudent, passwordHash: await hash('correct-password', 4) };
  const prisma = { user: { findFirst: async () => user } };
  const jwt = new JwtService({ secret: 'test-secret' });
  const response = await new AuthService(prisma as never, jwt).login({
    studentNo: user.studentNo,
    password: 'correct-password',
  });
  const payload = await jwt.verifyAsync<AuthTokenPayload>(response.tokens.accessToken);

  assert.equal(payload.sub, user.id);
  assert.equal(payload.role, 'STUDENT');
  assert.equal(payload.type, 'access');
  assert.equal('sectionId' in payload, false);
});

test('auth service rejects wrong passwords and inactive accounts', async () => {
  const passwordHash = await hash('correct-password', 4);
  const jwt = new JwtService({ secret: 'test-secret' });
  const wrongPassword = new AuthService(
    { user: { findFirst: async () => ({ ...activeStudent, passwordHash }) } } as never,
    jwt,
  );
  await assert.rejects(
    () => wrongPassword.login({ studentNo: 'S001', password: 'wrong-password' }),
    UnauthorizedException,
  );

  const inactive = new AuthService(
    {
      user: {
        findFirst: async () => ({ ...activeStudent, status: 'INACTIVE' as const, passwordHash }),
      },
    } as never,
    jwt,
  );
  await assert.rejects(
    () => inactive.login({ studentNo: 'S001', password: 'correct-password' }),
    ForbiddenException,
  );
});

test('jwt guard rejects expired access tokens', async () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const token = await jwt.signAsync(
    { sub: activeStudent.id, role: activeStudent.role, type: 'access' },
    { expiresIn: -1 },
  );
  const request = { headers: { authorization: `Bearer ${token}` } };
  const context = httpContext(request);
  const guard = new JwtAuthGuard(
    { getAllAndOverride: () => false } as never,
    jwt,
    { user: { findUnique: async () => activeStudent } } as never,
  );

  await assert.rejects(() => guard.canActivate(context), (error: unknown) => {
    assert.ok(error instanceof UnauthorizedException);
    assert.equal((error.getResponse() as { code: number }).code, 2003);
    return true;
  });
});

test('roles guard enforces the declared role matrix', () => {
  const context = httpContext({ headers: {}, user: activeStudent });
  const studentGuard = new RolesGuard({ getAllAndOverride: () => ['STUDENT'] } as never);
  const adminGuard = new RolesGuard({ getAllAndOverride: () => ['ADMIN'] } as never);

  assert.equal(studentGuard.canActivate(context), true);
  assert.throws(() => adminGuard.canActivate(context), ForbiddenException);
});

test('roles guard applies default admin, teacher, and me path policies', () => {
  const guard = new RolesGuard({ getAllAndOverride: () => undefined } as never);
  assert.equal(
    guard.canActivate(httpContext({ headers: {}, url: '/api/v1/me/cases', user: activeStudent })),
    true,
  );
  assert.throws(
    () =>
      guard.canActivate(
        httpContext({ headers: {}, url: '/api/v1/admin/cases', user: activeStudent }),
      ),
    ForbiddenException,
  );
  assert.throws(
    () =>
      guard.canActivate(
        httpContext({ headers: {}, url: '/api/v1/teacher/sections', user: activeStudent }),
      ),
    ForbiddenException,
  );
});

test('section access rejects cross-section students and teachers', async () => {
  const prisma = {
    classSection: {
      count: async ({ where }: { where: { id: string; teacherId: string } }) =>
        where.id === 'section-1' && where.teacherId === 'teacher-1' ? 1 : 0,
    },
    enrollment: {
      count: async ({ where }: { where: { sectionId: string; userId: string } }) =>
        where.sectionId === 'section-1' && where.userId === 'student-1' ? 1 : 0,
    },
  };
  const access = new SectionAccessService(prisma as never);
  const teacher = { ...activeStudent, id: 'teacher-1', role: 'TEACHER' as const };

  await access.assertSectionAccess(activeStudent, 'section-1');
  await access.assertSectionAccess(teacher, 'section-1');
  await assert.rejects(() => access.assertSectionAccess(activeStudent, 'section-2'), ForbiddenException);
  await assert.rejects(() => access.assertSectionAccess(teacher, 'section-2'), ForbiddenException);
});

test('submission request rejects client-supplied userId', () => {
  const result = SubmissionCreateRequestSchema.safeParse({
    code: 'def solve(data): return {}',
    userId: 'another-student',
  });
  assert.equal(result.success, false);
});

function httpContext(request: unknown) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as never;
}
