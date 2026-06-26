import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import type {
  ApiResponse,
  DatasetDto,
  RunResultDto,
  TemplateDto,
  UserDto,
} from '@decision-lab/shared';

export interface AuthLoginRequest {
  studentNo?: string;
  email?: string;
  password?: string;
}

export interface AuthLoginResponse {
  user: UserDto;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface CurrentCourseResponse {
  id: string;
  code: string;
  name: string;
  description?: string;
  currentTerm?: {
    id: string;
    name: string;
    startsAt?: string;
    endsAt?: string;
    sections: CourseSectionSummary[];
  };
}

export interface CourseSectionSummary {
  id: string;
  name: string;
  assignments: CourseAssignmentSummary[];
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

export interface ExerciseListItem {
  id: string;
  title: string;
  kind: string;
  entrypoint?: string;
  case: {
    id: string;
    code: string;
    title: string;
    subtitle?: string;
    difficulty: string;
    knowledgePoints: string[];
  };
  assignment?: {
    id: string;
    title: string;
    dueAt?: string;
  };
  datasets: Array<Pick<DatasetDto, 'id' | 'key' | 'label' | 'visibility'>>;
}

export interface ExerciseDetail extends ExerciseListItem {
  outputSchema?: Record<string, unknown>;
  guide?: Record<string, unknown>;
  case: ExerciseListItem['case'] & {
    summary?: string;
  };
  assignment?: ExerciseListItem['assignment'] & {
    maxAttempts?: number;
  };
  datasets: Array<Pick<DatasetDto, 'id' | 'key' | 'label' | 'visibility' | 'sortOrder'>>;
  template?: Pick<TemplateDto, 'id' | 'filename' | 'language'>;
  rubric?: {
    id: string;
    version: number;
    totalScore: number;
    rules: Record<string, unknown>[];
  };
}

export interface DatasetDownloadInfo extends Pick<DatasetDto, 'id' | 'key' | 'label' | 'visibility'> {
  path?: string;
}

export interface SubmissionCreateResponse {
  submissionId: string;
  status: string;
  statusUrl: string;
  resultUrl: string;
}

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

  createSubmission(assignmentId: string, body: { code: string; datasetKey?: string }) {
    return this.post<SubmissionCreateResponse>(`assignments/${assignmentId}/submissions`, body);
  }

  submissionResult(id: string) {
    return this.get<RunResultDto>(`submissions/${id}/results`);
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
