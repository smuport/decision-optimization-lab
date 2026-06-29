import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { AuthLoginRequest, AuthLoginResponse, AuthTokenPayload, UserDto } from '@decision-lab/shared';
import { PrismaService } from '../prisma/prisma.service';
import { forbidden, unauthorized } from './auth.exceptions';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(body: AuthLoginRequest): Promise<AuthLoginResponse> {
    const user = await this.prisma.user.findFirst({
      where: body.studentNo ? { studentNo: body.studentNo } : { email: body.email },
    });

    if (!user?.passwordHash || !(await compare(body.password, user.passwordHash))) {
      throw unauthorized('账号或密码错误');
    }
    if (user.status !== 'ACTIVE') {
      throw forbidden('账号已停用', 'ACCOUNT_INACTIVE');
    }

    const accessPayload: AuthTokenPayload = { sub: user.id, role: user.role, type: 'access' };
    const refreshPayload: AuthTokenPayload = { sub: user.id, role: user.role, type: 'refresh' };

    return {
      user: this.toUserDto(user),
      tokens: {
        accessToken: await this.jwt.signAsync(accessPayload, { expiresIn: 60 * 60 }),
        refreshToken: await this.jwt.signAsync(refreshPayload, { expiresIn: 7 * 24 * 60 * 60 }),
        expiresIn: 60 * 60,
      },
    };
  }

  toUserDto(user: {
    id: string;
    email: string;
    studentNo: string | null;
    name: string;
    role: UserDto['role'];
    status: UserDto['status'];
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      studentNo: user.studentNo ?? undefined,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  }
}
