import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ApiExceptionFilter } from '../common/api-exception.filter';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { SectionAccessService } from './section-access.service';

const jwtSecret = process.env.DECISION_LAB_JWT_SECRET ?? 'decision-lab-local-dev-secret-change-me';

@Global()
@Module({
  imports: [JwtModule.register({ global: true, secret: jwtSecret })],
  controllers: [AuthController],
  providers: [
    AuthService,
    SectionAccessService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
  exports: [AuthService, SectionAccessService],
})
export class AuthModule {}
