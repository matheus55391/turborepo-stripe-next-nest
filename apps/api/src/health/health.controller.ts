import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @ApiOperation({ summary: 'Health check' })
  @Get()
  async check() {
    const checks: Record<string, 'up' | 'down'> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }

    try {
      await this.redis.client.ping();
      checks.redis = 'up';
    } catch {
      checks.redis = 'down';
    }

    const allUp = Object.values(checks).every((v) => v === 'up');

    return { status: allUp ? 'ok' : 'degraded', checks };
  }
}
