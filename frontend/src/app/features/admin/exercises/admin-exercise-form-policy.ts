import type { AdminExerciseDetailDto, ExerciseStatus } from '@decision-lab/shared';

export function canPublishExercise(item: AdminExerciseDetailDto | null, dirty: boolean) {
  return item?.status === 'DRAFT' && item.resourceCheck.ready && !dirty;
}

export function canArchiveExercise(status: ExerciseStatus | undefined, dirty: boolean) {
  return status === 'PUBLISHED' && !dirty;
}

export function parseJsonObject(text: string, label: string) {
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new Error(`${label}必须是 JSON 对象`);
  }
}
