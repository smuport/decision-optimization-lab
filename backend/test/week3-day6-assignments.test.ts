import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateTeacherAssignmentRequestSchema, UpdateTeacherAssignmentRequestSchema } from '@decision-lab/shared';
import { assignmentAvailability } from '../src/assignments/assignment-availability';
import { AssignmentsService } from '../src/assignments/assignments.service';

const teacher = { id: 'teacher-1', role: 'TEACHER' } as const;
const student = { id: 'student-1', role: 'STUDENT' } as const;
const access = { assertSectionAccess: async () => undefined };
const readyExercises = { resourceCheck: async () => ({ ready: true }) };
const now = new Date('2026-07-01T12:00:00.000Z');
const baseExercise = { id: 'exercise-1', caseId: 'case-1', code: 'production_planning', title: '生产计划', description: null, kind: 'EXACT_MODELING', status: 'PUBLISHED', assetPath: 'assets', sortOrder: 1, case: { id: 'case-1', code: 'case_01', title: '案例' } };
const baseAssignment = { id: 'assignment-1', sectionId: 'section-1', exerciseId: 'exercise-1', title: '作业', description: null, status: 'DRAFT', opensAt: null, dueAt: null, maxAttempts: 2, allowLate: false, publishedAt: null, createdById: teacher.id, exercise: baseExercise };

test('assignment request contracts validate windows, attempts, and nullable updates', () => {
  assert.equal(CreateTeacherAssignmentRequestSchema.safeParse({ exerciseId: 'exercise-1', title: '作业', allowLate: false, maxAttempts: 0 }).success, false);
  assert.equal(CreateTeacherAssignmentRequestSchema.safeParse({ exerciseId: 'exercise-1', title: '作业', allowLate: false, opensAt: '2026-07-02T00:00:00.000Z', dueAt: '2026-07-01T00:00:00.000Z' }).success, false);
  assert.equal(UpdateTeacherAssignmentRequestSchema.safeParse({ opensAt: null, dueAt: null, maxAttempts: null }).success, true);
});

test('availability covers empty schedule, future, open, late, deadline closed, manual close, and archive', () => {
  const published = { status: 'PUBLISHED' as const, opensAt: null, dueAt: null, allowLate: false };
  assert.equal(assignmentAvailability(published, now), 'OPEN');
  assert.equal(assignmentAvailability({ ...published, opensAt: new Date('2026-07-02T00:00:00Z') }, now), 'UPCOMING');
  assert.equal(assignmentAvailability({ ...published, opensAt: new Date('2026-07-01T00:00:00Z'), dueAt: new Date('2026-07-02T00:00:00Z') }, now), 'OPEN');
  assert.equal(assignmentAvailability({ ...published, dueAt: new Date('2026-07-01T00:00:00Z'), allowLate: true }, now), 'LATE');
  assert.equal(assignmentAvailability({ ...published, dueAt: new Date('2026-07-01T00:00:00Z') }, now), 'CLOSED');
  assert.equal(assignmentAvailability({ ...published, status: 'CLOSED' }, now), 'CLOSED');
  assert.equal(assignmentAvailability({ ...published, status: 'ARCHIVED' }, now), 'CLOSED');
});

test('assignment creation rejects unpublished exercises and unreleased cases', async () => {
  const unpublished = new AssignmentsService({ exercise: { findUnique: async () => ({ ...baseExercise, status: 'DRAFT' }) } } as never, access as never, readyExercises as never);
  await assert.rejects(() => unpublished.create(teacher as never, 'section-1', { exerciseId: 'exercise-1', title: '作业', allowLate: false }), BadRequestException);
  const unreleased = new AssignmentsService({ exercise: { findUnique: async () => baseExercise }, sectionCaseRelease: { count: async () => 0 } } as never, access as never, readyExercises as never);
  await assert.rejects(() => unreleased.create(teacher as never, 'section-1', { exerciseId: 'exercise-1', title: '作业', allowLate: false }), BadRequestException);
});

test('publication rejects incomplete resources before changing state', async () => {
  const service = new AssignmentsService({ assignment: { findUnique: async () => baseAssignment }, exercise: { findUnique: async () => baseExercise }, sectionCaseRelease: { count: async () => 1 } } as never, access as never, { resourceCheck: async () => ({ ready: false }) } as never);
  await assert.rejects(() => service.publish(teacher as never, 'assignment-1'), BadRequestException);
});

test('assignment status follows draft to published to closed to archived only', async () => {
  let current: any = { ...baseAssignment };
  const includeResult = () => ({ ...current, exercise: baseExercise });
  const prisma = {
    assignment: { findUnique: async () => includeResult(), update: async ({ data }: any) => { current = { ...current, ...data }; return includeResult(); } },
    exercise: { findUnique: async () => ({ ...baseExercise, templates: [], datasets: [], rubrics: [] }) },
    sectionCaseRelease: { count: async () => 1 },
    $transaction: async (callback: any) => callback({ assignment: prisma.assignment, sectionCaseRelease: prisma.sectionCaseRelease }),
  };
  const service = new AssignmentsService(prisma as never, access as never, readyExercises as never);
  assert.equal((await service.publish(teacher as never, current.id)).status, 'PUBLISHED');
  assert.equal((await service.close(teacher as never, current.id)).status, 'CLOSED');
  assert.equal((await service.archive(teacher as never, current.id)).status, 'ARCHIVED');
  await assert.rejects(() => service.publish(teacher as never, current.id), ConflictException);
});

test('submission start rejects upcoming, closed, and exhausted assignments', async () => {
  async function rejectsFor(assignment: any, count = 0) {
    const transaction = { assignment: { findUnique: async () => assignment }, submission: { count: async () => count, create: async () => ({ id: 'submission-1' }) } };
    const service = new AssignmentsService({ assignment: { findUnique: async () => assignment }, $transaction: async (callback: any) => callback(transaction) } as never, access as never, readyExercises as never);
    return service.startSubmission(student as never, assignment.id, 'code');
  }
  await assert.rejects(() => rejectsFor({ ...baseAssignment, status: 'PUBLISHED', opensAt: new Date(Date.now() + 60_000) }), ConflictException);
  await assert.rejects(() => rejectsFor({ ...baseAssignment, status: 'CLOSED' }), ConflictException);
  await assert.rejects(() => rejectsFor({ ...baseAssignment, status: 'PUBLISHED' }, 2), ConflictException);
});

test('late submission is marked and attempt number is allocated in transaction', async () => {
  let createData: any;
  const assignment = { ...baseAssignment, status: 'PUBLISHED', dueAt: new Date(Date.now() - 60_000), allowLate: true };
  const transaction = { assignment: { findUnique: async () => assignment }, submission: { count: async () => 1, create: async ({ data }: any) => { createData = data; return { id: 'submission-2', ...data }; } } };
  const service = new AssignmentsService({ assignment: { findUnique: async () => assignment }, $transaction: async (callback: any) => callback(transaction) } as never, access as never, readyExercises as never);
  await service.startSubmission(student as never, assignment.id, 'code');
  assert.equal(createData.attemptNumber, 2);
  assert.equal(createData.isLate, true);
  assert.equal(createData.userId, student.id);
});
