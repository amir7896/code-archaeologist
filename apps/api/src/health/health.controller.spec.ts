import { ServiceUnavailableException } from '@nestjs/common';
import { recordHttpResult, resetMetricsForTests } from '../common/metrics';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const prisma = { ping: jest.fn() };
  const redis = { ping: jest.fn() };
  const controller = new HealthController(
    prisma as never,
    redis as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resetMetricsForTests();
  });

  it('returns liveness without checking dependencies', () => {
    expect(controller.liveness()).toMatchObject({ status: 'ok', service: 'api' });
  });

  it('returns in-memory request counts without secrets', () => {
    recordHttpResult(200);
    recordHttpResult(500);
    expect(controller.metrics()).toMatchObject({
      requests: 2,
      errors: 1,
      status: { '200': 1, '500': 1 },
    });
  });

  it('returns ready when postgres and redis ping', async () => {
    prisma.ping.mockResolvedValue(true);
    redis.ping.mockResolvedValue(true);

    await expect(controller.readiness()).resolves.toMatchObject({
      status: 'ok',
      checks: { postgres: true, redis: true },
    });
  });

  it('throws when a dependency is down', async () => {
    prisma.ping.mockRejectedValue(new Error('db down'));
    redis.ping.mockResolvedValue(true);

    await expect(controller.readiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
