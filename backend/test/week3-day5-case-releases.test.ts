import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BatchCreateSectionCaseReleasesRequestSchema, CreateSectionCaseReleaseRequestSchema } from '@decision-lab/shared';
import { CaseReleasesService } from '../src/case-releases/case-releases.service';

const teacher = { id: 'teacher-1', role: 'TEACHER' } as const;
const student = { id: 'student-1', role: 'STUDENT' } as const;
const access = { assertSectionAccess: async () => undefined };
const now = new Date();
const baseCase = { id: 'case-1', code: 'case_01', title: '生产计划', subtitle: null, difficulty: 'EASY', status: 'PUBLISHED', sortOrder: 1, knowledgePoints: [], summary: null, content: null };
const baseRelease = { id: 'release-1', sectionId: 'section-1', caseId: 'case-1', status: 'PUBLISHED', visibleFrom: null, visibleUntil: null, sortOrder: 1, publishedAt: now, createdById: teacher.id, createdAt: now, updatedAt: now, case: baseCase };

test('release request contracts reject inverted windows and empty batches', () => {
  assert.equal(CreateSectionCaseReleaseRequestSchema.safeParse({ caseId: 'case-1', visibleFrom: '2026-07-02T00:00:00.000Z', visibleUntil: '2026-07-01T00:00:00.000Z' }).success, false);
  assert.equal(BatchCreateSectionCaseReleasesRequestSchema.safeParse({ caseIds: [] }).success, false);
});

test('release creation only accepts published cases and rejects duplicates', async () => {
  const unpublished = new CaseReleasesService({ case: { findUnique: async () => ({ status: 'DRAFT' }) } } as never, access as never);
  await assert.rejects(() => unpublished.create(teacher as never, 'section-1', { caseId: 'case-1', status: 'DRAFT', sortOrder: 0 }), BadRequestException);

  const duplicate = new CaseReleasesService({
    case: { findUnique: async () => ({ status: 'PUBLISHED' }) },
    sectionCaseRelease: { create: async () => { throw { code: 'P2002' }; } },
  } as never, access as never);
  await assert.rejects(() => duplicate.create(teacher as never, 'section-1', { caseId: 'case-1', status: 'PUBLISHED', sortOrder: 0 }), ConflictException);
});

test('batch release validates every case before transaction writes', async () => {
  let transactions = 0;
  const service = new CaseReleasesService({
    case: { count: async () => 1 }, sectionCaseRelease: { count: async () => 0 },
    $transaction: async () => { transactions += 1; return []; },
  } as never, access as never);
  await assert.rejects(() => service.batchCreate(teacher as never, 'section-1', { caseIds: ['case-1', 'case-2'], sortOrder: 0 }), BadRequestException);
  assert.equal(transactions, 0);
});

test('partial release update validates against the stored window boundary', async () => {
  const service = new CaseReleasesService({ sectionCaseRelease: { findUnique: async () => ({ ...baseRelease, visibleUntil: new Date('2026-07-01T00:00:00.000Z') }) } } as never, access as never);
  await assert.rejects(() => service.update(teacher as never, 'release-1', { visibleFrom: '2026-07-02T00:00:00.000Z' }), BadRequestException);
});

test('student visibility query enforces active enrollment, published state, and time window', async () => {
  let where: any;
  const service = new CaseReleasesService({ sectionCaseRelease: { findMany: async (args: any) => { where = args.where; return []; } } } as never, access as never);
  await service.studentCases(student as never);
  assert.equal(where.status, 'PUBLISHED');
  assert.deepEqual(where.section.enrollments.some, { userId: student.id, status: 'ACTIVE' });
  assert.equal(where.AND.length, 2);
  assert.equal(where.AND[0].OR[0].visibleFrom, null);
  assert.equal(where.AND[1].OR[0].visibleUntil, null);
});

test('student case exposes only assignments from the released section', async () => {
  const release = { ...baseRelease, case: { ...baseCase, exercises: [{ id: 'exercise-1', code: 'ex-1', title: '练习', kind: 'EXACT_MODELING', assignments: [
    { id: 'assignment-1', sectionId: 'section-1', title: '本班作业', status: 'PUBLISHED', opensAt: null, dueAt: null, allowLate: false },
    { id: 'assignment-2', sectionId: 'section-2', title: '他班作业', status: 'PUBLISHED', opensAt: null, dueAt: null, allowLate: false },
  ] }] } };
  const service = new CaseReleasesService({ sectionCaseRelease: { findMany: async () => [release] } } as never, access as never);
  const result = await service.studentCase(student as never, 'case-1');
  assert.deepEqual(result.assignments.map((item) => item.id), ['assignment-1']);
  assert.equal(result.assignments[0].exercise.id, 'exercise-1');
});

test('archived or unavailable case is not returned as student detail', async () => {
  const service = new CaseReleasesService({ sectionCaseRelease: { findMany: async () => [] } } as never, access as never);
  await assert.rejects(() => service.studentCase(student as never, 'case-1'), NotFoundException);
});
