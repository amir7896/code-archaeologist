import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { ApiOkExample } from '../../common/swagger/swagger-docs';
import { HealthResponseDto, MetricsResponseDto } from '../dto/health-response.dto';
import { healthResponseExample, metricsResponseExample, readyResponseExample } from './health.schema';

export const LivenessDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Liveness probe' }),
    ApiOkExample(HealthResponseDto, healthResponseExample, 'API is up'),
  );

export const MetricsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'In-memory request counts. No secrets.' }),
    ApiOkExample(MetricsResponseDto, metricsResponseExample, 'Process counters'),
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
