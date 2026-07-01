import type { StudentAssignmentDto } from '@decision-lab/shared';

export function legacyWorkspaceTarget(assignments: StudentAssignmentDto[], exerciseId: string | null) {
  const matches = assignments.filter((item) => item.exercise.id === exerciseId);
  if (matches.length === 1) return { commands: ['/assignments', matches[0].id, 'workspace'], notice: undefined };
  return {
    commands: ['/'],
    notice: matches.length > 1 ? '该练习对应多个作业，请从作业列表选择。' : '没有找到可访问的作业。',
  };
}
