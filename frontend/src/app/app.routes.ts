import type { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guards';
import { AdminCasesPlaceholderComponent } from './features/admin/admin-cases-placeholder.component';
import { AccessStatusComponent } from './features/auth/access-status.component';
import { CaseDetailComponent } from './features/cases/case-detail.component';
import { CourseHomeComponent } from './features/course-home/course-home.component';
import { LoginComponent } from './features/login/login.component';
import { SubmissionDetailComponent } from './features/submissions/submission-detail.component';
import { TeacherDashboardComponent } from './features/teacher/teacher-dashboard.component';
import { WorkspaceComponent } from './features/workspace/workspace.component';

export const routes: Routes = [
  { path: 'auth/login', component: LoginComponent, title: '登录' },
  { path: 'unauthorized', component: AccessStatusComponent, title: '登录失效', data: { status: 401 } },
  { path: 'forbidden', component: AccessStatusComponent, title: '无权访问', data: { status: 403 } },
  {
    path: '',
    component: CourseHomeComponent,
    title: '课程首页',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT'] },
  },
  {
    path: 'cases/:caseId',
    component: CaseDetailComponent,
    title: '案例详情',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT'] },
  },
  {
    path: 'exercises/:exerciseId/workspace',
    component: WorkspaceComponent,
    title: '实验工作区',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT'] },
  },
  {
    path: 'submissions/:submissionId',
    component: SubmissionDetailComponent,
    title: '提交详情',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
  },
  {
    path: 'teacher',
    component: TeacherDashboardComponent,
    title: '教师面板',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['TEACHER'] },
  },
  {
    path: 'admin/cases',
    component: AdminCasesPlaceholderComponent,
    title: '内容管理',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
  },
  { path: '**', component: AccessStatusComponent, title: '页面不存在', data: { status: 404 } },
];
