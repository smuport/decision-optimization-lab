import { BadRequestException } from '@nestjs/common';

type RuntimeSchema<T> = {
  safeParse(value: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ message: string }> } };
};

export function parseRequest<T>(schema: RuntimeSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  }

  throw new BadRequestException({
    code: 1001,
    message: '请求参数错误',
    details: result.error.issues.map((issue) => issue.message).join('; '),
  });
}
