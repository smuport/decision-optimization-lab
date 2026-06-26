import type { Routes } from '@angular/router';
import { CaseDetailComponent } from './features/cases/case-detail.component';
import { CourseHomeComponent } from './features/course-home/course-home.component';
import { LoginComponent } from './features/login/login.component';
import { WorkspacePlaceholderComponent } from './features/workspace-placeholder/workspace-placeholder.component';

export const routes: Routes = [
  { path: '', component: CourseHomeComponent, title: '课程首页' },
  { path: 'auth/login', component: LoginComponent, title: '登录' },
  { path: 'cases/:caseId', component: CaseDetailComponent, title: '案例详情' },
  { path: 'exercises/:exerciseId/workspace', component: WorkspacePlaceholderComponent, title: '实验工作区' },
  { path: '**', redirectTo: '' },
];
