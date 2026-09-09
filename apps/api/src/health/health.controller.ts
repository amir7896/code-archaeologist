import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LivenessDocs, ReadinessDocs } from './swagger/health.swagger';
import { APP_VERSION } from '@code-archaeologist/shared';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../database/redis.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  @Get('health')
  @LivenessDocs()
  liveness(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'api',
      version: APP_VERSION,
    };
  }

  @Get('health/ready')
  @ReadinessDocs()
  async readiness(): Promise<HealthResponseDto> {
    const checks = {
      postgres: await this.safePing(() => this.prisma.ping()),
      redis: await this.safePing(() => this.redis.ping()),
    };

    const ready = checks.postgres && checks.redis;
    const body: HealthResponseDto = {
      status: ready ? 'ok' : 'degraded',
      service: 'api',
      version: APP_VERSION,
      checks,
    };

    if (!ready) {
      throw new ServiceUnavailableException(body);
    }

    return body;
  }

  private async safePing(fn: () => Promise<boolean>): Promise<boolean> {
    try {
      return await fn();
    } catch {
      return false;
    }
  }
}
