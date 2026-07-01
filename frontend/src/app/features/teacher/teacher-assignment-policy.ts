import type { AssignmentStatus } from '@decision-lab/shared';

export function validAssignmentWindow(opensAt: string, dueAt: string) {
  return !opensAt || !dueAt || opensAt <= dueAt;
}

export function canEditAssignment(status: AssignmentStatus) { return status === 'DRAFT'; }
export function canPublishAssignment(status: AssignmentStatus, resourcesReady: boolean) { return status === 'DRAFT' && resourcesReady; }
export function canCloseAssignment(status: AssignmentStatus) { return status === 'PUBLISHED'; }
export function canArchiveAssignment(status: AssignmentStatus) { return status === 'CLOSED'; }
