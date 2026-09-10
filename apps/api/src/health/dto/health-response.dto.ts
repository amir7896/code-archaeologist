import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthChecksDto {
  @ApiProperty({ type: Boolean, example: true })
  postgres!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  redis!: boolean;
}

export class MetricsResponseDto {
  @ApiProperty({ type: Number, example: 12 })
  requests!: number;

  @ApiProperty({ type: Number, example: 0 })
  errors!: number;

  @ApiProperty({ type: Object, example: { '200': 12 } })
  status!: Record<string, number>;

  @ApiProperty({ type: Number, example: 80 })
  uptimeSeconds!: number;
}

export class HealthResponseDto {
  @ApiProperty({ type: String, example: 'ok', enum: ['ok', 'degraded'] })
  status!: string;

  @ApiProperty({ type: String, example: 'api' })
  service!: string;

  @ApiProperty({ type: String, example: '1.0.0' })
  version!: string;

  @ApiPropertyOptional({ type: () => HealthChecksDto })
  checks?: HealthChecksDto;
}
