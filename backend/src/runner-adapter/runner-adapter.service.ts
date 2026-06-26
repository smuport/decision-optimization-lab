import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

type RunnerResult = {
  status: string;
  isFeasible: boolean;
  objective?: number;
  optimalObjective?: number;
  gap?: number;
  runtimeMs?: number;
  score?: number;
  metrics?: Record<string, unknown>;
  visualization?: Record<string, unknown>;
  messages?: string[];
  artifacts?: Record<string, unknown>;
};

@Injectable()
export class RunnerAdapterService {
  private readonly rootDir = resolve(__dirname, '..', '..', '..');

  async evaluate(input: {
    caseCode: string;
    datasetKey: string;
    code: string;
  }): Promise<RunnerResult> {
    const workDir = await mkdtemp(join(tmpdir(), 'decision-lab-submission-'));
    const submissionPath = join(workDir, 'solution.py');
    const outputPath = join(workDir, 'result.json');
    await writeFile(submissionPath, input.code, 'utf8');

    const { exitCode, stderr } = await this.runPython([
      'runner/evaluate.py',
      '--case',
      input.caseCode,
      '--dataset',
      input.datasetKey,
      '--submission',
      submissionPath,
      '--output',
      outputPath,
    ]);

    const resultText = await readFile(outputPath, 'utf8').catch(() => '');
    const parsed = resultText ? (JSON.parse(resultText) as RunnerResult) : undefined;

    if (parsed) {
      return parsed;
    }

    return {
      status: exitCode === 0 ? 'SUCCESS' : 'RUNTIME_ERROR',
      isFeasible: false,
      score: 0,
      messages: [stderr || 'runner 未返回结构化结果'],
      metrics: {},
      artifacts: {},
    };
  }

  private runPython(args: string[]): Promise<{ exitCode: number | null; stderr: string }> {
    return new Promise((resolvePromise) => {
      const child = spawn('python3', args, {
        cwd: this.rootDir,
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.on('close', (exitCode) => {
        resolvePromise({ exitCode, stderr });
      });
    });
  }
}

