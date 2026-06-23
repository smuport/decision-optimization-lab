export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: string;
  path?: string;
  timestamp: string;
}

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type DatasetVisibility = 'PUBLIC' | 'HIDDEN';

export type ExerciseKind = 'EXACT_MODELING' | 'HEURISTIC' | 'REPORT' | 'MIXED';

export type SubmissionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RUNTIME_ERROR'
  | 'INVALID_OUTPUT';

export interface RunResultDto {
  status: SubmissionStatus;
  isFeasible: boolean;
  objective?: number;
  optimalObjective?: number;
  gap?: number;
  score?: number;
  metrics?: Record<string, unknown>;
  messages: string[];
  artifacts?: Record<string, unknown>;
}
