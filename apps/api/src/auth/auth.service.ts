import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Plan } from '@prisma/client';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  plan: Plan;
  avatarUrl: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly metrics: MetricsService,
  ) {}

  private toSafeUser(user: {
    id: string;
    email: string;
    name: string | null;
    plan: Plan;
    avatarUrl: string | null;
  }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      avatarUrl: user.avatarUrl,
    };
  }

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }
    const hash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hash,
        name: dto.name ?? null,
      },
    });
    this.metrics.authAttemptsTotal.inc({
      action: 'register',
      result: 'success',
    });
    return this.toSafeUser(user);
  }

  async validateUser(dto: LoginDto): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      this.metrics.authAttemptsTotal.inc({
        action: 'login',
        result: 'failure',
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }
    this.metrics.authAttemptsTotal.inc({ action: 'login', result: 'success' });
    return this.toSafeUser(user);
  }

  signAccessToken(user: SafeUser): string {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }
}
