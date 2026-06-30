import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AdminExercisesService } from '../src/exercises/admin-exercises.service';
import { ExerciseAssetsService, type ExerciseResourceRecord } from '../src/exercises/exercise-assets.service';
import { ResourcePackageService } from '../src/exercises/resource-package.service';

const repositoryRoot = resolve(__dirname, '..', '..');
const fixtureSource = resolve(repositoryRoot, 'course-assets/cases/case_01/exercises/production_planning');
const assetPath = 'course-assets/cases/case_01/exercises/production_planning';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'decision-lab-day4-'));
  const directory = resolve(root, assetPath);
  cpSync(fixtureSource, directory, { recursive: true });
  const assets = new ExerciseAssetsService();
  (assets as any).projectRoot = root;
  const record: ExerciseResourceRecord = {
    id: 'exercise-1', code: 'production_planning', assetPath, entrypoint: 'solve',
    outputSchema: { objective: 'number' },
    templates: [{ isDefault: true, path: `${assetPath}/template.py` }],
    datasets: [{ key: 'small', visibility: 'PUBLIC', path: 'datasets/public/data_small.json' }],
    rubrics: [{ isActive: true }],
  };
  return { root, directory, assets, record };
}

test('resource check passes the complete case01 Exercise fixture', () => {
  const setup = fixture();
  try {
    const check = setup.assets.inspect(setup.record);
    assert.equal(check.ready, true);
    assert.deepEqual(check.checks, {
      entrypoint: true, outputSchema: true, defaultTemplate: true,
      publicDataset: true, activeRubric: true, validator: true,
    });
  } finally { rmSync(setup.root, { recursive: true, force: true }); }
});

test('resource check reports each of the six missing resource classes', async (context) => {
  const scenarios: Array<[string, keyof ReturnType<ExerciseAssetsService['inspect']>['checks'], (setup: ReturnType<typeof fixture>) => void]> = [
    ['entrypoint', 'entrypoint', (setup) => { setup.record.entrypoint = null; }],
    ['output schema', 'outputSchema', (setup) => { setup.record.outputSchema = {}; }],
    ['default template', 'defaultTemplate', (setup) => { setup.record.templates = []; }],
    ['public dataset', 'publicDataset', (setup) => { setup.record.datasets = []; }],
    ['active rubric', 'activeRubric', (setup) => { setup.record.rubrics = []; }],
    ['validator', 'validator', (setup) => { rmSync(join(setup.directory, 'validator.py')); }],
  ];
  for (const [label, key, mutate] of scenarios) {
    await context.test(label, () => {
      const setup = fixture();
      try {
        mutate(setup);
        const check = setup.assets.inspect(setup.record);
        assert.equal(check.ready, false);
        assert.equal(check.checks[key], false);
        assert.ok(check.messages.length > 0);
      } finally { rmSync(setup.root, { recursive: true, force: true }); }
    });
  }
});

test('Exercise publication is blocked when resource check is not ready', async () => {
  const exercise = { ...fixtureRecordForService(), status: 'DRAFT' as const };
  const service = new AdminExercisesService(
    { exercise: { findUnique: async () => exercise } } as never,
    { inspect: () => ({ exerciseId: exercise.id, ready: false, checkedAt: new Date().toISOString(), checks: { entrypoint: true, outputSchema: true, defaultTemplate: false, publicDataset: true, activeRubric: true, validator: true }, messages: ['默认模板缺失'] }) } as never,
  );
  await assert.rejects(() => service.updateStatus(exercise.id, 'PUBLISHED'), BadRequestException);
});

test('Exercise publication is blocked after its Case is archived', async () => {
  const exercise = { ...fixtureRecordForService(), status: 'DRAFT' as const, case: { ...fixtureRecordForService().case, status: 'ARCHIVED' as const } };
  const service = new AdminExercisesService(
    { exercise: { findUnique: async () => exercise } } as never,
    { inspect: () => ({ ready: true }) } as never,
  );
  await assert.rejects(() => service.updateStatus(exercise.id, 'PUBLISHED'), ConflictException);
});

test('Ready Exercise follows DRAFT to PUBLISHED transition', async () => {
  const exercise = { ...fixtureRecordForService(), status: 'DRAFT' as const };
  let updateData: unknown;
  const service = new AdminExercisesService(
    {
      exercise: {
        findUnique: async () => exercise,
        update: async ({ data }: { data: unknown }) => { updateData = data; return { ...exercise, status: 'PUBLISHED' }; },
      },
    } as never,
    { inspect: () => ({ exerciseId: exercise.id, ready: true, checkedAt: new Date().toISOString(), checks: { entrypoint: true, outputSchema: true, defaultTemplate: true, publicDataset: true, activeRubric: true, validator: true }, messages: [] }) } as never,
  );
  const published = await service.updateStatus(exercise.id, 'PUBLISHED');
  assert.deepEqual(updateData, { status: 'PUBLISHED' });
  assert.equal(published.status, 'PUBLISHED');
});

test('Exercise create rejects duplicate codes inside one Case', async () => {
  const service = new AdminExercisesService(
    {
      case: { findUnique: async () => ({ id: 'case-1', status: 'PUBLISHED' }) },
      exercise: { findUnique: async () => ({ id: 'existing-exercise' }) },
    } as never,
    {} as never,
  );
  await assert.rejects(
    () => service.create('case-1', { code: 'production_planning', title: '重复练习', kind: 'EXACT_MODELING', assetPath, sortOrder: 0 }),
    ConflictException,
  );
});

test('Published Exercise can be archived without deleting history relations', async () => {
  const current = { ...fixtureRecordForService(), status: 'PUBLISHED' as const };
  let updateData: unknown;
  const assets = { inspect: () => ({ exerciseId: current.id, ready: true, checkedAt: new Date().toISOString(), checks: { entrypoint: true, outputSchema: true, defaultTemplate: true, publicDataset: true, activeRubric: true, validator: true }, messages: [] }) };
  const service = new AdminExercisesService(
    {
      exercise: {
        findUnique: async () => current,
        update: async ({ data }: { data: unknown }) => { updateData = data; return { ...current, status: 'ARCHIVED' }; },
      },
    } as never,
    assets as never,
  );
  const archived = await service.updateStatus(current.id, 'ARCHIVED');
  assert.deepEqual(updateData, { status: 'ARCHIVED' });
  assert.equal(archived.status, 'ARCHIVED');
  assert.equal(archived.id, current.id);
});

test('Published Exercise cannot be edited into an incomplete resource state', async () => {
  const current = { ...fixtureRecordForService(), status: 'PUBLISHED' as const };
  const service = new AdminExercisesService(
    {
      exercise: { findUnique: async () => ({ id: current.id, status: current.status }) },
      $transaction: async (operation: (transaction: unknown) => unknown) => operation({ exercise: { update: async () => ({ ...current, assetPath: 'course-assets/missing' }) } }),
    } as never,
    { inspect: () => ({ ready: false, messages: ['资源目录不存在'] }) } as never,
  );
  await assert.rejects(() => service.update(current.id, { assetPath: 'course-assets/missing' }), BadRequestException);
});

test('resource package contains only the student whitelist', () => {
  const setup = fixture();
  try {
    const manifestPath = join(setup.directory, 'exercise_manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.datasets.push({ key: 'hidden', label: '隐藏数据', visibility: 'HIDDEN', path: 'datasets/hidden/secret.json' });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    writeFileSync(join(setup.directory, 'reference_solution.py'), 'REFERENCE_SOLUTION_SECRET');
    writeFileSync(join(setup.directory, 'internal-note.txt'), 'INTERNAL_RUBRIC_SECRET');
    const hiddenPath = join(setup.directory, 'datasets/hidden/secret.json');
    mkdirSync(dirname(hiddenPath), { recursive: true });
    cpSync(join(setup.directory, 'datasets/public/data_small.json'), hiddenPath);

    const exercise = {
      ...fixtureRecordForService(),
      case: { code: 'case_01', title: '生产分配问题' },
      outputSchema: { objective: 'number' },
      templates: [{ filename: 'template.py', content: 'DATABASE_TEMPLATE', isDefault: true }],
      datasets: [
        { key: 'small', label: '小规模', visibility: 'PUBLIC', path: 'datasets/public/data_small.json' },
        { key: 'hidden', label: '隐藏数据', visibility: 'HIDDEN', path: 'datasets/hidden/secret.json' },
      ],
    };
    const service = new ResourcePackageService(
      { exercise: { findUniqueOrThrow: async () => exercise } } as never,
      setup.assets,
    );
    return service.buildExerciseResources(exercise.id).then((result) => {
      const zipPath = join(setup.root, result.filename);
      writeFileSync(zipPath, result.buffer);
      const names = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).trim().split('\n').sort();
      assert.deepEqual(names, ['README.md', 'datasets/data_small.json', 'output-schema.json', 'template/template.py']);
      const raw = result.buffer.toString('utf8');
      assert.doesNotMatch(raw, /REFERENCE_SOLUTION_SECRET|INTERNAL_RUBRIC_SECRET|validator\.py|rubric\.json|secret\.json/);
    }).finally(() => rmSync(setup.root, { recursive: true, force: true }));
  } catch (error) {
    rmSync(setup.root, { recursive: true, force: true });
    throw error;
  }
});

function fixtureRecordForService() {
  return {
    id: 'exercise-1', caseId: 'case-1', code: 'production_planning', title: '生产分配实验',
    description: null, kind: 'EXACT_MODELING', assetPath, entrypoint: 'solve',
    outputSchema: { objective: 'number' }, guide: {}, sortOrder: 1,
    case: { id: 'case-1', code: 'case_01', title: '生产分配问题', status: 'PUBLISHED' },
    templates: [{ isDefault: true, path: `${assetPath}/template.py` }],
    datasets: [{ key: 'small', visibility: 'PUBLIC', path: 'datasets/public/data_small.json' }],
    rubrics: [{ isActive: true }],
  };
}
