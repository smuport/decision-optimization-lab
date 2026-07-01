import type { AssignmentAvailability, AssignmentStatus } from '@decision-lab/shared';

export type AssignmentSchedule = {
  status: AssignmentStatus;
  opensAt: Date | null;
  dueAt: Date | null;
  allowLate: boolean;
};

export function assignmentAvailability(assignment: AssignmentSchedule, now = new Date()): AssignmentAvailability {
  if (assignment.status !== 'PUBLISHED') return 'CLOSED';
  if (assignment.opensAt && now < assignment.opensAt) return 'UPCOMING';
  if (assignment.dueAt && now > assignment.dueAt) return assignment.allowLate ? 'LATE' : 'CLOSED';
  return 'OPEN';
}
