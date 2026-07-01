import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import type {
  AdminCaseDetailDto,
  AdminCaseListItemDto,
  AdminCaseListQuery,
  AdminExerciseDetailDto,
  AdminExerciseListItemDto,
  ApiResponse,
  AuthLoginRequest,
  AuthLoginResponse,
  CreateCaseRequest,
  CreateExerciseRequest,
  BatchCreateSectionCaseReleasesRequest,
  CurrentCourseResponse,
  CurrentSectionsResponse,
  DatasetDownloadInfo,
  ExerciseDetail,
  ExerciseListItem,
  PaginatedResponse,
  RunResultDto,
  SubmissionCreateRequest,
  SubmissionCreateResponse,
  SubmissionDetailResponse,
  TeacherProgressResponse,
  TeacherCaseReleaseOverviewDto,
  TeacherSectionStudentDto,
  TeacherSubmissionListItem,
  TemplateDto,
  UpdateCaseRequest,
  UpdateCaseStatusRequest,
  UpdateExerciseRequest,
  UpdateExerciseStatusRequest,
  UpdateSectionCaseReleaseRequest,
  UpdateSectionCaseReleaseStatusRequest,
  StudentCaseDetailDto,
  StudentCaseDto,
  StudentAssignmentDetailDto,
  StudentAssignmentDto,
  TeacherAssignmentDto,
  TeacherAssignmentOverviewDto,
  CreateTeacherAssignmentRequest,
  UpdateTeacherAssignmentRequest,
  UserDto,
} from '@decision-lab/shared';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  login(body: AuthLoginRequest) {
    return this.post<AuthLoginResponse>('auth/login', body);
  }

  me() {
    return this.get<UserDto>('auth/me');
  }

  currentCourse() {
    return this.get<CurrentCourseResponse>('courses/current');
  }

  exercises() {
    return this.get<ExerciseListItem[]>('exercises');
  }

  exercise(id: string) {
    return this.get<ExerciseDetail>(`exercises/${id}`);
  }

  exerciseTemplate(id: string) {
    return this.get<TemplateDto>(`exercises/${id}/template`);
  }

  exerciseDatasets(id: string) {
    return this.get<DatasetDownloadInfo[]>(`exercises/${id}/datasets`);
  }

  exerciseResources(id: string) {
    return this.http.get(`${this.baseUrl}/exercises/${id}/resources/download`, {
      responseType: 'blob',
    });
  }

  createSubmission(assignmentId: string, body: SubmissionCreateRequest) {
    return this.post<SubmissionCreateResponse>(`assignments/${assignmentId}/submissions`, body);
  }

  submission(id: string) {
    return this.get<SubmissionDetailResponse>(`submissions/${id}`);
  }

  submissionResult(id: string) {
    return this.get<RunResultDto>(`submissions/${id}/results`);
  }

  currentSections() {
    return this.get<CurrentSectionsResponse>('terms/current/sections');
  }

  teacherProgress(sectionId: string) {
    return this.get<TeacherProgressResponse>(`teacher/sections/${sectionId}/progress`);
  }

  teacherSubmissions(assignmentId: string) {
    return this.get<TeacherSubmissionListItem[]>(`teacher/assignments/${assignmentId}/submissions`);
  }

  teacherSectionStudents(sectionId: string) {
    return this.get<TeacherSectionStudentDto[]>(`teacher/sections/${sectionId}/students`);
  }

  teacherCaseReleases(sectionId: string) {
    return this.get<TeacherCaseReleaseOverviewDto>(`teacher/sections/${sectionId}/case-releases`);
  }

  batchCreateTeacherCaseReleases(sectionId: string, body: BatchCreateSectionCaseReleasesRequest) {
    return this.post<TeacherCaseReleaseOverviewDto['releases']>(`teacher/sections/${sectionId}/case-releases/batch`, body);
  }

  updateTeacherCaseRelease(id: string, body: UpdateSectionCaseReleaseRequest) {
    return this.patch<TeacherCaseReleaseOverviewDto['releases'][number]>(`teacher/case-releases/${id}`, body);
  }

  updateTeacherCaseReleaseStatus(id: string, body: UpdateSectionCaseReleaseStatusRequest) {
    return this.patch<TeacherCaseReleaseOverviewDto['releases'][number]>(`teacher/case-releases/${id}/status`, body);
  }

  studentCases() {
    return this.get<StudentCaseDto[]>('me/cases');
  }

  studentCase(id: string) {
    return this.get<StudentCaseDetailDto>(`me/cases/${id}`);
  }

  studentAssignments() {
    return this.get<StudentAssignmentDto[]>('me/assignments');
  }

  studentAssignment(id: string) {
    return this.get<StudentAssignmentDetailDto>(`me/assignments/${id}`);
  }

  assignmentResources(id: string) {
    return this.http.get(`${this.baseUrl}/assignments/${id}/resources/download`, { responseType: 'blob' });
  }

  teacherAssignments(sectionId: string) {
    return this.get<TeacherAssignmentOverviewDto>(`teacher/sections/${sectionId}/assignments`);
  }

  teacherAssignment(id: string) {
    return this.get<TeacherAssignmentDto>(`teacher/assignments/${id}`);
  }

  createTeacherAssignment(sectionId: string, body: CreateTeacherAssignmentRequest) {
    return this.post<TeacherAssignmentDto>(`teacher/sections/${sectionId}/assignments`, body);
  }

  updateTeacherAssignment(id: string, body: UpdateTeacherAssignmentRequest) {
    return this.patch<TeacherAssignmentDto>(`teacher/assignments/${id}`, body);
  }

  publishTeacherAssignment(id: string) { return this.post<TeacherAssignmentDto>(`teacher/assignments/${id}/publish`, {}); }
  closeTeacherAssignment(id: string) { return this.post<TeacherAssignmentDto>(`teacher/assignments/${id}/close`, {}); }
  archiveTeacherAssignment(id: string) { return this.post<TeacherAssignmentDto>(`teacher/assignments/${id}/archive`, {}); }

  adminCases(query: AdminCaseListQuery = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http
      .get<PaginatedResponse<AdminCaseListItemDto>>(`${this.baseUrl}/admin/cases`, { params })
      .pipe(map((response) => response.data));
  }

  adminCase(id: string) {
    return this.get<AdminCaseDetailDto>(`admin/cases/${id}`);
  }

  createAdminCase(body: CreateCaseRequest) {
    return this.post<AdminCaseDetailDto>('admin/cases', body);
  }

  updateAdminCase(id: string, body: UpdateCaseRequest) {
    return this.patch<AdminCaseDetailDto>(`admin/cases/${id}`, body);
  }

  updateAdminCaseStatus(id: string, body: UpdateCaseStatusRequest) {
    return this.patch<AdminCaseDetailDto>(`admin/cases/${id}/status`, body);
  }

  adminExercises(caseId: string) {
    return this.get<AdminExerciseListItemDto[]>(`admin/cases/${caseId}/exercises`);
  }

  createAdminExercise(caseId: string, body: CreateExerciseRequest) {
    return this.post<AdminExerciseDetailDto>(`admin/cases/${caseId}/exercises`, body);
  }

  adminExercise(id: string) {
    return this.get<AdminExerciseDetailDto>(`admin/exercises/${id}`);
  }

  updateAdminExercise(id: string, body: UpdateExerciseRequest) {
    return this.patch<AdminExerciseDetailDto>(`admin/exercises/${id}`, body);
  }

  updateAdminExerciseStatus(id: string, body: UpdateExerciseStatusRequest) {
    return this.patch<AdminExerciseDetailDto>(`admin/exercises/${id}/status`, body);
  }

  adminExerciseResourceCheck(id: string) {
    return this.get<AdminExerciseDetailDto['resourceCheck']>(`admin/exercises/${id}/resource-check`);
  }

  private get<T>(path: string) {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${path}`).pipe(map((response) => response.data));
  }

  private post<T>(path: string, body: unknown) {
    return this.http
      .post<ApiResponse<T>>(`${this.baseUrl}/${path}`, body)
      .pipe(map((response) => response.data));
  }
  private patch<T>(path: string, body: unknown) {
    return this.http
      .patch<ApiResponse<T>>(`${this.baseUrl}/${path}`, body)
      .pipe(map((response) => response.data));
  }
}
