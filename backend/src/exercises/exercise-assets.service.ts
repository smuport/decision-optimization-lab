import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { ExerciseResourceCheckDto } from '@decision-lab/shared';

export type ExerciseManifest = {
  exercise_code: string;
  entrypoint: string;
  output_schema: Record<string, unknown>;
  template: { path: string; filename: string; language: string };
  datasets: Array<{ key: string; label: string; visibility: 'PUBLIC' | 'HIDDEN'; path: string }>;
  rubric: string;
  validator: string;
};

export type ExerciseResourceRecord = {
  id: string;
  code: string;
  assetPath: string;
  entrypoint: string | null;
  outputSchema: unknown;
  templates: Array<{ isDefault: boolean; path: string | null }>;
  datasets: Array<{ key: string; visibility: 'PUBLIC' | 'HIDDEN'; path: string | null }>;
  rubrics: Array<{ isActive: boolean }>;
};

@Injectable()
export class ExerciseAssetsService {
  readonly projectRoot = findProjectRoot();

  loadManifest(assetPath: string): { directory: string; manifest: ExerciseManifest } {
    const directory = this.resolveAssetDirectory(assetPath);
    const manifestPath = this.resolveInside(directory, 'exercise_manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ExerciseManifest;
    return { directory, manifest };
  }

  inspect(exercise: ExerciseResourceRecord): ExerciseResourceCheckDto {
    const checks = {
      entrypoint: Boolean(exercise.entrypoint?.trim()),
      outputSchema: isNonEmptyObject(exercise.outputSchema),
      defaultTemplate: false,
      publicDataset: false,
      activeRubric: false,
      validator: false,
    };
    const messages: string[] = [];

    let directory: string | undefined;
    let manifest: ExerciseManifest | undefined;
    try {
      ({ directory, manifest } = this.loadManifest(exercise.assetPath));
      if (manifest.exercise_code !== exercise.code) {
        messages.push('exercise_manifest.json 的 exercise_code 与练习编码不一致');
      }
    } catch (error) {
      messages.push(`练习 manifest 不可用: ${errorMessage(error)}`);
    }

    if (!checks.entrypoint) messages.push('未配置 entrypoint');
    if (!checks.outputSchema) messages.push('未配置有效的 output schema');

    if (directory && manifest) {
      const defaults = exercise.templates.filter((template) => template.isDefault);
      checks.defaultTemplate = defaults.length === 1 && this.fileExists(directory, manifest.template?.path);
      if (!checks.defaultTemplate) messages.push('必须存在且只能存在一个可读取的默认模板');

      const publicDatasets = exercise.datasets.filter((dataset) => dataset.visibility === 'PUBLIC');
      checks.publicDataset =
        publicDatasets.length > 0 &&
        publicDatasets.every((dataset) => {
          const manifestDataset = manifest?.datasets?.find((item) => item.key === dataset.key && item.visibility === 'PUBLIC');
          return Boolean(manifestDataset && this.fileExists(directory!, manifestDataset.path));
        });
      if (!checks.publicDataset) messages.push('至少需要一个数据库与 manifest 一致的公开数据集');

      checks.activeRubric =
        exercise.rubrics.filter((rubric) => rubric.isActive).length === 1 &&
        this.fileExists(directory, manifest.rubric);
      if (!checks.activeRubric) messages.push('必须存在且只能存在一个 active rubric，并且 rubric 文件可读取');

      checks.validator = this.validatorLoads(directory, manifest.validator);
      if (!checks.validator) messages.push('validator 文件不存在或 Python 语法检查失败');
    } else {
      messages.push('默认模板、公开数据集、rubric 和 validator 无法完成检查');
    }

    return {
      exerciseId: exercise.id,
      ready: Object.values(checks).every(Boolean) && messages.every((message) => !message.includes('不一致')),
      checkedAt: new Date().toISOString(),
      checks,
      messages,
    };
  }

  resolveInside(directory: string, relativePath: string) {
    const resolved = resolve(directory, relativePath);
    if (resolved !== directory && !resolved.startsWith(`${directory}${sep}`)) {
      throw new Error(`资源路径越界: ${relativePath}`);
    }
    return resolved;
  }

  private resolveAssetDirectory(assetPath: string) {
    const assetsRoot = resolve(this.projectRoot, 'course-assets');
    const directory = resolve(this.projectRoot, assetPath);
    if (directory !== assetsRoot && !directory.startsWith(`${assetsRoot}${sep}`)) {
      throw new Error(`assetPath 必须位于 course-assets 内: ${assetPath}`);
    }
    if (!existsSync(directory)) throw new Error(`练习资源目录不存在: ${assetPath}`);
    return directory;
  }

  private fileExists(directory: string, relativePath?: string) {
    if (!relativePath) return false;
    try {
      return existsSync(this.resolveInside(directory, relativePath));
    } catch {
      return false;
    }
  }

  private validatorLoads(directory: string, relativePath?: string) {
    if (!relativePath || !this.fileExists(directory, relativePath)) return false;
    const path = this.resolveInside(directory, relativePath);
    const result = spawnSync(
      'python3',
      [
        '-c',
        'import importlib.util,sys; sys.dont_write_bytecode=True; p=sys.argv[1]; s=importlib.util.spec_from_file_location("validator_check",p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m)',
        path,
      ],
      { encoding: 'utf8', timeout: 5000 },
    );
    return result.status === 0;
  }
}

function isNonEmptyObject(value: unknown) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function findProjectRoot() {
  const candidates = [process.cwd(), resolve(process.cwd(), '..'), resolve(__dirname, '..', '..', '..')];
  return candidates.find((candidate) => existsSync(resolve(candidate, 'course-assets'))) ?? resolve(__dirname, '..', '..', '..');
}
