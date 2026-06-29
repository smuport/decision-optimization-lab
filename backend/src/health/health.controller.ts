import { Controller, Get } from '@nestjs/common';
import type { ApiResponse } from '@decision-lab/shared';
import { Public } from '../auth/auth.decorators';

interface HealthDto {
  status: 'ok';
  service: 'decision-optimization-lab-api';
}

@Controller('health')
@Public()
export class HealthController {
  @Get()
  health(): ApiResponse<HealthDto> {
    return {
      code: 0,
      message: 'OK',
      data: {
        status: 'ok',
        service: 'decision-optimization-lab-api',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
