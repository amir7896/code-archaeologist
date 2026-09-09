import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthChecksDto {
  @ApiProperty({ type: Boolean, example: true })
  postgres!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  redis!: boolean;
}

export class HealthResponseDto {
  @ApiProperty({ type: String, example: 'ok', enum: ['ok', 'degraded'] })
  status!: string;

  @ApiProperty({ type: String, example: 'api' })
  service!: string;

  @ApiProperty({ type: String, example: '0.1.0' })
  version!: string;

  @ApiPropertyOptional({ type: () => HealthChecksDto })
  checks?: HealthChecksDto;
}
