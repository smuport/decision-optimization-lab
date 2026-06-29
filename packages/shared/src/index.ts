import { z } from 'zod';

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

export const CASE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const EXERCISE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const CASE_RELEASE_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const ASSIGNMENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] as const;
export const ASSIGNMENT_AVAILABILITIES = ['UPCOMING', 'OPEN', 'LATE', 'CLOSED'] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];
export type ExerciseStatus = (typeof EXERCISE_STATUSES)[number];
export type CaseReleaseStatus = (typeof CASE_RELEASE_STATUSES)[number];
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
export type AssignmentAvailability = (typeof ASSIGNMENT_AVAILABILITIES)[number];

export const CaseStatusSchema = z.enum(CASE_STATUSES);
export const ExerciseStatusSchema = z.enum(EXERCISE_STATUSES);
export const CaseReleaseStatusSchema = z.enum(CASE_RELEASE_STATUSES);
export const AssignmentStatusSchema = z.enum(ASSIGNMENT_STATUSES);
export const AssignmentAvailabilitySchema = z.enum(ASSIGNMENT_AVAILABILITIES);

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

export const AuthLoginRequestSchema = z
  .object({
    studentNo: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    password: z.string().min(1),
  })
  .strict()
  .refine((value) => Boolean(value.studentNo || value.email), {
    message: 'studentNo or email is required',
  });

export type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>;

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export interface AuthLoginResponse {
  user: UserDto;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface CourseAssignmentSummary {
  id: string;
  title: string;
  dueAt?: string;
  exercise: {
    id: string;
    title: string;
    caseCode: string;
    caseTitle: string;
  };
}

export interface CourseSectionSummary {
  id: string;
  name: string;
  assignments: CourseAssignmentSummary[];
}

export interface CurrentCourseResponse extends CourseDto {
  currentTerm?: {
    id: string;
    name: string;
    startsAt?: string;
    endsAt?: string;
    sections: CourseSectionSummary[];
  };
}

export interface ExerciseListItem {
  id: string;
  title: string;
  kind: ExerciseKind;
  entrypoint?: string;
  case: Pick<CaseDto, 'id' | 'code' | 'title' | 'subtitle' | 'difficulty' | 'knowledgePoints'>;
  assignment?: Pick<AssignmentDto, 'id' | 'title' | 'dueAt'>;
  datasets: Array<Pick<DatasetDto, 'id' | 'key' | 'label' | 'visibility'>>;
}

export interface ExerciseDetail extends ExerciseListItem {
  outputSchema?: Record<string, unknown>;
  guide?: Record<string, unknown>;
  case: ExerciseListItem['case'] & Pick<CaseDto, 'summary'>;
  assignment?: ExerciseListItem['assignment'] & Pick<AssignmentDto, 'maxAttempts'>;
  datasets: Array<Pick<DatasetDto, 'id' | 'key' | 'label' | 'visibility' | 'sortOrder'>>;
  template?: Pick<TemplateDto, 'id' | 'filename' | 'language'>;
  rubric?: Pick<RubricDto, 'id' | 'version' | 'totalScore' | 'rules'>;
}

export interface DatasetDownloadInfo
  extends Pick<DatasetDto, 'id' | 'key' | 'label' | 'visibility'> {
  path?: string;
}

export const SubmissionCreateRequestSchema = z
  .object({
    code: z.string().min(1),
    datasetKey: z.string().trim().min(1).optional(),
  })
  .strict();
export type SubmissionCreateRequest = z.infer<typeof SubmissionCreateRequestSchema>;

export interface SubmissionCreateResponse {
  submissionId: string;
  status: SubmissionStatus;
  statusUrl: string;
  resultUrl: string;
}

export interface SubmissionDetailResponse extends SubmissionDto {
  codeText?: string;
  exercise: {
    id: string;
    title: string;
    caseCode: string;
    caseTitle: string;
  };
  user: Pick<UserDto, 'id' | 'name' | 'studentNo'>;
  result?: RunResultDto;
  reportEntry: {
    enabled: boolean;
    status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
  };
  manualGradeEntry: {
    enabled: boolean;
    count: number;
  };
}

export interface CurrentSectionsResponse {
  term: Pick<TermDto, 'id' | 'name'>;
  sections: Array<{
    id: string;
    name: string;
    teacher?: Pick<UserDto, 'id' | 'name' | 'email'>;
    enrollmentCount: number;
  }>;
}

export interface TeacherProgressResponse {
  section: Pick<ClassSectionDto, 'id' | 'name'>;
  enrollmentCount: number;
  assignmentCount: number;
  submissionCount: number;
  successCount: number;
  passRate: number;
  averageScore: number;
  assignments: Array<{
    id: string;
    title: string;
    exerciseTitle: string;
    caseCode: string;
    submissionCount: number;
    successCount: number;
    averageScore: number;
  }>;
}

export interface TeacherSubmissionListItem {
  id: string;
  status: SubmissionStatus;
  attemptNumber: number;
  submittedAt: string;
  completedAt?: string;
  student: Pick<UserDto, 'id' | 'name' | 'studentNo'>;
  score?: number;
  objective?: number;
  reportStatus: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
  manualGradeCount: number;
}

export interface AdminCaseListItemDto {
  id: string;
  courseId: string;
  code: string;
  title: string;
  subtitle?: string;
  category: 'LINEAR_PROGRAMMING' | 'INTEGER_PROGRAMMING' | 'HEURISTIC' | 'META_HEURISTIC' | 'REPORT_ANALYSIS';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: CaseStatus;
  knowledgePoints: string[];
  summary?: string;
  sortOrder: number;
  exerciseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCaseDetailDto extends AdminCaseListItemDto {
  content?: Record<string, unknown>;
  exercises: AdminExerciseListItemDto[];
}

export interface AdminExerciseListItemDto {
  id: string;
  caseId: string;
  code: string;
  title: string;
  description?: string;
  kind: ExerciseKind;
  status: ExerciseStatus;
  assetPath: string;
  sortOrder: number;
}

export interface AdminExerciseDetailDto extends AdminExerciseListItemDto {
  entrypoint?: string;
  outputSchema?: Record<string, unknown>;
  guide?: Record<string, unknown>;
  resourceCheck: ExerciseResourceCheckDto;
}

export interface ExerciseResourceCheckDto {
  exerciseId: string;
  ready: boolean;
  checkedAt: string;
  checks: {
    entrypoint: boolean;
    outputSchema: boolean;
    defaultTemplate: boolean;
    publicDataset: boolean;
    activeRubric: boolean;
    validator: boolean;
  };
  messages: string[];
}

export interface SectionCaseReleaseDto {
  id: string;
  sectionId: string;
  caseId: string;
  status: CaseReleaseStatus;
  visibleFrom?: string;
  visibleUntil?: string;
  sortOrder: number;
  publishedAt?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  case?: Pick<AdminCaseListItemDto, 'id' | 'code' | 'title' | 'status'>;
}

export interface TeacherAssignmentDto {
  id: string;
  sectionId: string;
  exerciseId: string;
  title: string;
  description?: string;
  status: AssignmentStatus;
  availability: AssignmentAvailability;
  opensAt?: string;
  dueAt?: string;
  maxAttempts?: number;
  allowLate: boolean;
  publishedAt?: string;
  createdById: string;
  exercise?: AdminExerciseListItemDto & {
    case: Pick<AdminCaseListItemDto, 'id' | 'code' | 'title'>;
  };
}

export interface StudentCaseDto {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  knowledgePoints: string[];
  summary?: string;
  sortOrder: number;
  visibleFrom?: string;
  visibleUntil?: string;
  assignments: Array<Pick<StudentAssignmentDto, 'id' | 'title' | 'status' | 'availability' | 'opensAt' | 'dueAt'>>;
}

export interface StudentCaseDetailDto extends StudentCaseDto {
  content?: Record<string, unknown>;
}

export interface StudentAssignmentDto {
  id: string;
  title: string;
  description?: string;
  status: AssignmentStatus;
  availability: AssignmentAvailability;
  opensAt?: string;
  dueAt?: string;
  maxAttempts?: number;
  allowLate: boolean;
  attemptCount: number;
  exercise: AdminExerciseListItemDto & {
    case: Pick<AdminCaseListItemDto, 'id' | 'code' | 'title'>;
  };
}

export interface StudentAssignmentDetailDto extends StudentAssignmentDto {
  datasets: Array<Pick<DatasetDto, 'id' | 'key' | 'label' | 'visibility' | 'sortOrder'>>;
  template?: Pick<TemplateDto, 'id' | 'filename' | 'language'>;
  outputSchema?: Record<string, unknown>;
  guide?: Record<string, unknown>;
}

const optionalDateTime = z.iso.datetime().optional();
const caseCategorySchema = z.enum([
  'LINEAR_PROGRAMMING',
  'INTEGER_PROGRAMMING',
  'HEURISTIC',
  'META_HEURISTIC',
  'REPORT_ANALYSIS',
]);
const difficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);
const exerciseKindSchema = z.enum(['EXACT_MODELING', 'HEURISTIC', 'REPORT', 'MIXED']);

export const CreateCaseRequestSchema = z.object({
  courseId: z.string().min(1),
  code: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).optional(),
  category: caseCategorySchema,
  difficulty: difficultySchema,
  knowledgePoints: z.array(z.string().trim().min(1)).default([]),
  summary: z.string().trim().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().int().default(0),
});
export type CreateCaseRequest = z.infer<typeof CreateCaseRequestSchema>;

export const UpdateCaseRequestSchema = CreateCaseRequestSchema.omit({ courseId: true, code: true }).partial();
export type UpdateCaseRequest = z.infer<typeof UpdateCaseRequestSchema>;

export const UpdateCaseStatusRequestSchema = z.object({ status: CaseStatusSchema });
export type UpdateCaseStatusRequest = z.infer<typeof UpdateCaseStatusRequestSchema>;

export const CreateExerciseRequestSchema = z.object({
  code: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().optional(),
  kind: exerciseKindSchema,
  entrypoint: z.string().trim().optional(),
  outputSchema: z.record(z.string(), z.unknown()).optional(),
  guide: z.record(z.string(), z.unknown()).optional(),
  assetPath: z.string().trim().min(1),
  sortOrder: z.number().int().default(0),
});
export type CreateExerciseRequest = z.infer<typeof CreateExerciseRequestSchema>;

export const UpdateExerciseRequestSchema = CreateExerciseRequestSchema.omit({ code: true }).partial();
export type UpdateExerciseRequest = z.infer<typeof UpdateExerciseRequestSchema>;

export const UpdateExerciseStatusRequestSchema = z.object({ status: ExerciseStatusSchema });
export type UpdateExerciseStatusRequest = z.infer<typeof UpdateExerciseStatusRequestSchema>;

function validWindow(value: { visibleFrom?: string; visibleUntil?: string }) {
  return !value.visibleFrom || !value.visibleUntil || Date.parse(value.visibleFrom) <= Date.parse(value.visibleUntil);
}

export const CreateSectionCaseReleaseRequestSchema = z.object({
  caseId: z.string().min(1),
  status: CaseReleaseStatusSchema.default('DRAFT'),
  visibleFrom: optionalDateTime,
  visibleUntil: optionalDateTime,
  sortOrder: z.number().int().default(0),
}).refine(validWindow, { message: 'visibleFrom must not be later than visibleUntil' });
export type CreateSectionCaseReleaseRequest = z.infer<typeof CreateSectionCaseReleaseRequestSchema>;
export const CreateCaseReleaseRequestSchema = CreateSectionCaseReleaseRequestSchema;
export type CreateCaseReleaseRequest = CreateSectionCaseReleaseRequest;

export const UpdateSectionCaseReleaseRequestSchema = z.object({
  visibleFrom: optionalDateTime,
  visibleUntil: optionalDateTime,
  sortOrder: z.number().int().optional(),
}).refine(validWindow, { message: 'visibleFrom must not be later than visibleUntil' });
export type UpdateSectionCaseReleaseRequest = z.infer<typeof UpdateSectionCaseReleaseRequestSchema>;
export const UpdateCaseReleaseRequestSchema = UpdateSectionCaseReleaseRequestSchema;
export type UpdateCaseReleaseRequest = UpdateSectionCaseReleaseRequest;

export const UpdateSectionCaseReleaseStatusRequestSchema = z.object({ status: CaseReleaseStatusSchema });
export type UpdateSectionCaseReleaseStatusRequest = z.infer<typeof UpdateSectionCaseReleaseStatusRequestSchema>;

function validAssignmentWindow(value: { opensAt?: string; dueAt?: string }) {
  return !value.opensAt || !value.dueAt || Date.parse(value.opensAt) <= Date.parse(value.dueAt);
}

export const CreateTeacherAssignmentRequestSchema = z.object({
  exerciseId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().optional(),
  opensAt: optionalDateTime,
  dueAt: optionalDateTime,
  maxAttempts: z.number().int().positive().optional(),
  allowLate: z.boolean().default(false),
}).refine(validAssignmentWindow, { message: 'opensAt must not be later than dueAt' });
export type CreateTeacherAssignmentRequest = z.infer<typeof CreateTeacherAssignmentRequestSchema>;
export const CreateAssignmentRequestSchema = CreateTeacherAssignmentRequestSchema;
export type CreateAssignmentRequest = CreateTeacherAssignmentRequest;

export const UpdateTeacherAssignmentRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().optional(),
  opensAt: optionalDateTime,
  dueAt: optionalDateTime,
  maxAttempts: z.number().int().positive().optional(),
  allowLate: z.boolean().optional(),
}).refine(validAssignmentWindow, { message: 'opensAt must not be later than dueAt' });
export type UpdateTeacherAssignmentRequest = z.infer<typeof UpdateTeacherAssignmentRequestSchema>;
export const UpdateAssignmentRequestSchema = UpdateTeacherAssignmentRequestSchema;
export type UpdateAssignmentRequest = UpdateTeacherAssignmentRequest;

export type StudentCaseListItemDto = StudentCaseDto;
export type StudentAssignmentListItemDto = StudentAssignmentDto;
