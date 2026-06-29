import type { UserDto } from '@decision-lab/shared';

export type CurrentUserData = UserDto;

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  url?: string;
  user?: CurrentUserData;
}
