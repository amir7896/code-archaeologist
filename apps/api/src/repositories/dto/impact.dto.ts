import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class ImpactQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  fileId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  symbolId?: string;

  @ApiPropertyOptional({ type: Number, default: 2, minimum: 1, maximum: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  depth = 2;
}

export class ImpactOriginDto {
  @ApiProperty({ type: String })
  subjectType!: string;

  @ApiProperty({ type: String })
  subjectId!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: String })
  fileId!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  symbolId!: string | null;

  @ApiProperty({ type: Number })
  riskScore!: number;

  @ApiProperty({ type: String })
  riskLevel!: string;
}

export class ImpactNodeDto {
  @ApiProperty({ type: String })
  fileId!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: Number })
  depth!: number;

  @ApiProperty({ type: String })
  direction!: string;

  @ApiProperty({ type: String })
  role!: string;

  @ApiProperty({ type: String })
  module!: string;

  @ApiProperty({ type: Number })
  riskScore!: number;

  @ApiProperty({ type: String })
  riskLevel!: string;

  @ApiProperty({ type: Number })
  complexity!: number;

  @ApiProperty({ type: Number })
  confidence!: number;
}

export class ImpactModuleDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: Number })
  consumerCount!: number;

  @ApiProperty({ type: Number })
  dependencyCount!: number;
}

export class ImpactStatsDto {
  @ApiProperty({ type: Number })
  affectedFileCount!: number;

  @ApiProperty({ type: Number })
  consumerCount!: number;

  @ApiProperty({ type: Number })
  dependencyCount!: number;

  @ApiProperty({ type: Number })
  testCount!: number;

  @ApiProperty({ type: Number })
  endpointCount!: number;

  @ApiProperty({ type: Number })
  moduleCount!: number;

  @ApiProperty({ type: Number })
  highRiskCount!: number;

  @ApiProperty({ type: Boolean })
  truncated!: boolean;
}

export class ImpactResponseDto {
  @ApiProperty({ type: String, required: false, nullable: true })
  revision!: string | null;

  @ApiProperty({ type: Number })
  depth!: number;

  @ApiProperty({ type: () => ImpactOriginDto })
  origin!: ImpactOriginDto;

  @ApiProperty({ type: () => ImpactStatsDto })
  stats!: ImpactStatsDto;

  @ApiProperty({ type: () => [ImpactNodeDto] })
  consumers!: ImpactNodeDto[];

  @ApiProperty({ type: () => [ImpactNodeDto] })
  dependencies!: ImpactNodeDto[];

  @ApiProperty({ type: () => [ImpactNodeDto] })
  tests!: ImpactNodeDto[];

  @ApiProperty({ type: () => [ImpactNodeDto] })
  endpoints!: ImpactNodeDto[];

  @ApiProperty({ type: () => [ImpactModuleDto] })
  modules!: ImpactModuleDto[];
}
