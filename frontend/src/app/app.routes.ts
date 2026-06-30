import type { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guards';
import { AdminCaseEditorComponent } from './features/admin/cases/admin-case-editor.component';
import { AdminCasesComponent } from './features/admin/cases/admin-cases.component';
import { AdminExerciseEditorComponent } from './features/admin/exercises/admin-exercise-editor.component';
import { AccessStatusComponent } from './features/auth/access-status.component';
import { CaseDetailComponent } from './features/cases/case-detail.component';
import { CourseHomeComponent } from './features/course-home/course-home.component';
import { LoginComponent } from './features/login/login.component';
import { SubmissionDetailComponent } from './features/submissions/submission-detail.component';
import { TeacherDashboardComponent } from './features/teacher/teacher-dashboard.component';
import { TeacherSectionComponent } from './features/teacher/teacher-section.component';
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
    path: 'teacher/sections/:sectionId', component: TeacherSectionComponent, title: '教学班管理',
    canActivate: [authGuard, roleGuard], data: { roles: ['TEACHER'] },
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
    component: AdminCasesComponent,
    title: '内容管理',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/cases/new',
    component: AdminCaseEditorComponent,
    title: '新建案例',
    canActivate: [authGuard, roleGuard],
    canDeactivate: [(component: AdminCaseEditorComponent) => component.canDeactivate()],
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/cases/:caseId',
    component: AdminCaseEditorComponent,
    title: '案例管理',
    canActivate: [authGuard, roleGuard],
    canDeactivate: [(component: AdminCaseEditorComponent) => component.canDeactivate()],
    data: { roles: ['ADMIN'] },
  },
  {
    path: 'admin/exercises/:exerciseId',
    component: AdminExerciseEditorComponent,
    title: '练习管理',
    canActivate: [authGuard, roleGuard],
    canDeactivate: [(component: AdminExerciseEditorComponent) => component.canDeactivate()],
    data: { roles: ['ADMIN'] },
  },
  { path: '**', component: AccessStatusComponent, title: '页面不存在', data: { status: 404 } },
];
