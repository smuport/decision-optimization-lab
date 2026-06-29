import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthLoginRequestSchema } from '@decision-lab/shared';
import { ok } from '../common/api-response';
import { parseRequest } from '../common/request-validation';
import { CurrentUser, Public } from './auth.decorators';
import { AuthService } from './auth.service';
import type { CurrentUserData } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() rawBody: unknown) {
    const body = parseRequest(AuthLoginRequestSchema, rawBody);
    return ok(await this.auth.login(body), '登录成功');
  }

  @Get('me')
  me(@CurrentUser() user: CurrentUserData) {
    return ok(user);
  }
}
