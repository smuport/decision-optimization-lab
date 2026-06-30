import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException } from '@nestjs/common';
import { CreateCaseRequestSchema } from '@decision-lab/shared';
import { CasesService } from '../src/cases/cases.service';

const now = new Date('2026-06-30T08:00:00.000Z');
const baseCase = {
  id: 'case-1', courseId: 'course-1', code: 'case_01', title: '生产计划优化', subtitle: null,
  category: 'LINEAR_PROGRAMMING', difficulty: 'EASY', status: 'DRAFT', knowledgePoints: [],
  summary: null, content: null, sortOrder: 1, createdAt: now, updatedAt: now, exercises: [],
};

test('case request contract rejects blank titles and invalid sort orders', () => {
  const valid = { courseId: 'course-1', code: 'case_02', title: '新案例', category: 'LINEAR_PROGRAMMING', difficulty: 'EASY', sortOrder: 2 };
  assert.equal(CreateCaseRequestSchema.safeParse(valid).success, true);
  assert.equal(CreateCaseRequestSchema.safeParse({ ...valid, title: ' ' }).success, false);
  assert.equal(CreateCaseRequestSchema.safeParse({ ...valid, sortOrder: 1.5 }).success, false);
  assert.equal(CreateCaseRequestSchema.safeParse({ ...valid, sortOrder: -1 }).success, false);
});

test('case creation rejects duplicate global codes', async () => {
  const service = new CasesService({
    course: { findUnique: async () => ({ id: 'course-1' }) },
    case: { findUnique: async () => ({ id: 'existing-case' }) },
  } as never);

  await assert.rejects(
    () => service.create({ courseId: 'course-1', code: 'case_01', title: '重复案例', category: 'LINEAR_PROGRAMMING', difficulty: 'EASY', knowledgePoints: [], sortOrder: 0 }),
    ConflictException,
  );
});

test('case status only moves from draft to published to archived', async () => {
  let current = { ...baseCase };
  const service = new CasesService({
    case: {
      findUnique: async ({ select }: { select?: unknown }) => select ? current : { ...current, exercises: [] },
      update: async ({ data }: { data: { status: typeof current.status } }) => {
        current = { ...current, ...data, updatedAt: now };
        return { ...current, exercises: [] };
      },
    },
  } as never);

  const published = await service.updateStatus('case-1', 'PUBLISHED');
  assert.equal(published.status, 'PUBLISHED');
  const archived = await service.updateStatus('case-1', 'ARCHIVED');
  assert.equal(archived.status, 'ARCHIVED');
  await assert.rejects(() => service.updateStatus('case-1', 'PUBLISHED'), ConflictException);
  await assert.rejects(() => service.update('case-1', { title: '不能修改' }), ConflictException);
});

test('case list applies pagination, status, keyword, and stable ordering', async () => {
  let findManyArgs: unknown;
  const service = new CasesService({
    case: {
      findMany: (args: unknown) => { findManyArgs = args; return Promise.resolve([{ ...baseCase, _count: { exercises: 2 } }]); },
      count: async () => 21,
    },
    $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations),
  } as never);

  const result = await service.list({ page: 2, pageSize: 10, status: 'DRAFT', keyword: '计划' });
  assert.equal(result.pagination.totalPages, 3);
  assert.equal(result.list[0].exerciseCount, 2);
  assert.deepEqual(findManyArgs, {
    where: {
      status: 'DRAFT',
      OR: [
        { code: { contains: '计划', mode: 'insensitive' } },
        { title: { contains: '计划', mode: 'insensitive' } },
        { subtitle: { contains: '计划', mode: 'insensitive' } },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    skip: 10,
    take: 10,
    include: { _count: { select: { exercises: true } } },
  });
});
