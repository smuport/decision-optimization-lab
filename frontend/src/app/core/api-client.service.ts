import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import type {
  ApiResponse,
  AuthLoginRequest,
  AuthLoginResponse,
  CurrentCourseResponse,
  CurrentSectionsResponse,
  DatasetDownloadInfo,
  ExerciseDetail,
  ExerciseListItem,
  RunResultDto,
  SubmissionCreateRequest,
  SubmissionCreateResponse,
  SubmissionDetailResponse,
  TeacherProgressResponse,
  TeacherSubmissionListItem,
  TemplateDto,
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

  private get<T>(path: string) {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${path}`).pipe(map((response) => response.data));
  }

  private post<T>(path: string, body: unknown) {
    return this.http
      .post<ApiResponse<T>>(`${this.baseUrl}/${path}`, body)
      .pipe(map((response) => response.data));
  }
}
