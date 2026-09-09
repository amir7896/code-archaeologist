import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { ApiOkExample } from '../../common/swagger/swagger-docs';
import { HealthResponseDto } from '../dto/health-response.dto';
import { healthResponseExample, readyResponseExample } from './health.schema';

export const LivenessDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Liveness probe' }),
    ApiOkExample(HealthResponseDto, healthResponseExample, 'API is up'),
  );

export const ReadinessDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Readiness probe for PostgreSQL and Redis' }),
    ApiOkExample(HealthResponseDto, readyResponseExample, 'Dependencies are reachable'),
    ApiServiceUnavailableResponse({
      type: HealthResponseDto,
      example: { ...readyResponseExample, status: 'degraded', checks: { postgres: false, redis: true } },
    }),
  );
