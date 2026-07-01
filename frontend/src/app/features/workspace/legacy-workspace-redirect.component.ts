import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiClientService } from '../../core/api-client.service';
import { legacyWorkspaceTarget } from './legacy-workspace-policy';

@Component({ selector: 'dol-legacy-workspace-redirect', standalone: true, template: '<div class="status-strip">正在迁移旧工作区链接...</div>' })
export class LegacyWorkspaceRedirectComponent implements OnInit {
  private readonly route = inject(ActivatedRoute); private readonly router = inject(Router); private readonly api = inject(ApiClientService);
  ngOnInit() { const exerciseId = this.route.snapshot.paramMap.get('exerciseId'); this.api.studentAssignments().subscribe({ next: (items) => { const target = legacyWorkspaceTarget(items, exerciseId); void this.router.navigate(target.commands, { queryParams: target.notice ? { notice: target.notice } : undefined }); }, error: () => void this.router.navigate(['/']) }); }
}
