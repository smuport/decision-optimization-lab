import { Body, Controller, Get, Post } from '@nestjs/common';
import { ok } from '../common/api-response';
import { PrismaService } from '../prisma/prisma.service';

type LoginBody = {
  studentNo?: string;
  email?: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('login')
  async login(@Body() body: LoginBody) {
    const user = await this.findUser(body);

    return ok(
      {
        user: this.toUserDto(user),
        tokens: {
          accessToken: `demo-token:${user.id}`,
          refreshToken: `demo-refresh:${user.id}`,
          expiresIn: 7 * 24 * 60 * 60,
        },
      },
      '登录成功',
    );
  }

  @Get('me')
  async me() {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { email: 'student.demo@decision-lab.local' },
    });

    return ok(this.toUserDto(user));
  }

  private async findUser(body: LoginBody) {
    const user = await this.prisma.user.findFirst({
      where: body.studentNo
        ? { studentNo: body.studentNo }
        : { email: body.email ?? 'student.demo@decision-lab.local' },
    });

    if (user) {
      return user;
    }

    return this.prisma.user.findFirstOrThrow({
      where: { email: 'student.demo@decision-lab.local' },
    });
  }

  private toUserDto(user: {
    id: string;
    email: string;
    studentNo: string | null;
    name: string;
    role: 'STUDENT' | 'TA' | 'TEACHER' | 'ADMIN';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  }) {
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

