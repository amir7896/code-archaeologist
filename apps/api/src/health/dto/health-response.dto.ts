import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthChecksDto {
  @ApiProperty({ example: true })
  postgres!: boolean;

  @ApiProperty({ example: true })
  redis!: boolean;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', enum: ['ok', 'degraded'] })
  status!: string;

  @ApiProperty({ example: 'api' })
  service!: string;

  @ApiProperty({ example: '0.1.0' })
  version!: string;

  @ApiPropertyOptional({ type: HealthChecksDto })
  checks?: HealthChecksDto;
}
