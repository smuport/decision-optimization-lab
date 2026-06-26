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

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  code: number;
  message: string;
  data: {
    list: T[];
    pagination: PaginationMeta;
  };
  timestamp: string;
}

export type UserRole = 'STUDENT' | 'TA' | 'TEACHER' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type EnrollmentStatus = 'ACTIVE' | 'INACTIVE';

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

export interface UserDto {
  id: string;
  email: string;
  studentNo?: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export interface CourseDto {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface TermDto {
  id: string;
  courseId: string;
  name: string;
  startsAt?: string;
  endsAt?: string;
}

export interface ClassSectionDto {
  id: string;
  termId: string;
  name: string;
  teacherId?: string;
}

export interface EnrollmentDto {
  id: string;
  sectionId: string;
  userId: string;
  status: EnrollmentStatus;
}

export interface CaseDto {
  id: string;
  courseId: string;
  code: string;
  title: string;
  subtitle?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  knowledgePoints: string[];
  summary?: string;
  sortOrder: number;
}

export interface ExerciseDto {
  id: string;
  caseId: string;
  title: string;
  kind: ExerciseKind;
  entrypoint?: string;
  outputSchema?: Record<string, unknown>;
  guide?: Record<string, unknown>;
  sortOrder: number;
}

export interface AssignmentDto {
  id: string;
  sectionId: string;
  exerciseId: string;
  title: string;
  opensAt?: string;
  dueAt?: string;
  maxAttempts?: number;
  allowLate: boolean;
}

export interface DatasetDto {
  id: string;
  exerciseId: string;
  key: string;
  label: string;
  visibility: DatasetVisibility;
  path?: string;
  sortOrder: number;
}

export interface TemplateDto {
  id: string;
  exerciseId: string;
  language: string;
  filename: string;
  content: string;
  isDefault: boolean;
}

export interface RubricDto {
  id: string;
  exerciseId: string;
  version: number;
  totalScore: number;
  rules: Record<string, unknown>[];
  isActive: boolean;
}

export interface SubmissionDto {
  id: string;
  assignmentId: string;
  userId: string;
  status: SubmissionStatus;
  attemptNumber: number;
  isLate: boolean;
  submittedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ReportDto {
  id: string;
  submissionId: string;
  authorId: string;
  status: 'DRAFT' | 'SUBMITTED';
  content?: string;
  attachments?: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export interface ManualGradeDto {
  id: string;
  submissionId: string;
  graderId: string;
  scoreDelta: number;
  comment?: string;
  createdAt: string;
}
