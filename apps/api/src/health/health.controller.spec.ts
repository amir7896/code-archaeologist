import { ServiceUnavailableException } from '@nestjs/common';
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
  });

  it('returns liveness without checking dependencies', () => {
    expect(controller.liveness()).toMatchObject({ status: 'ok', service: 'api' });
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
