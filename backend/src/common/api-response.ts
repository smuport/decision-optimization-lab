import type { ApiResponse } from '@decision-lab/shared';

export function ok<T>(data: T, message = 'OK'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

