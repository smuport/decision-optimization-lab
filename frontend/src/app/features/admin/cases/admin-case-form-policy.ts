import type { AdminCaseDetailDto, CaseStatus } from '@decision-lab/shared';

export function canPublishCase(item: Pick<AdminCaseDetailDto, 'status' | 'title'> | null, dirty: boolean) {
  return item?.status === 'DRAFT' && item.title.trim().length > 0 && !dirty;
}

export function canArchiveCase(status: CaseStatus | undefined, dirty: boolean) {
  return status === 'PUBLISHED' && !dirty;
}

export function shouldConfirmCaseExit(dirty: boolean) {
  return !dirty || window.confirm('有未保存的案例修改，确定离开当前页面吗？');
}
