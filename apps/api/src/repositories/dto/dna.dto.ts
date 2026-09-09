import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class DnaQueryDto {
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

  @ApiPropertyOptional({ type: String, maxLength: 240 })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  module?: string;
}

export class InsightsQueryDto {
  @ApiPropertyOptional({ type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

export class DnaContributorDto {
  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  email!: string;

  @ApiProperty({ type: Number })
  commits!: number;
}

export class DnaFactorDto {
  @ApiProperty({ type: String })
  key!: string;

  @ApiProperty({ type: String })
  label!: string;

  @ApiProperty({ type: Number })
  raw!: number;

  @ApiProperty({ type: Number })
  normalized!: number;

  @ApiProperty({ type: Number })
  weight!: number;

  @ApiProperty({ type: Number })
  contribution!: number;
}

export class DnaRiskDto {
  @ApiProperty({ type: Number })
  score!: number;

  @ApiProperty({ type: String })
  level!: string;

  @ApiProperty({ type: Number })
  evidenceConfidence!: number;

  @ApiProperty({ type: () => [DnaFactorDto] })
  factors!: DnaFactorDto[];
}

export class DnaVersionDto {
  @ApiProperty({ type: String })
  revision!: string;

  @ApiProperty({ type: String })
  changeType!: string;

  @ApiProperty({ type: Number })
  loc!: number;

  @ApiProperty({ type: Number })
  complexity!: number;

  @ApiProperty({ type: String, format: 'date-time', required: false, nullable: true })
  committedAt!: Date | null;
}

export class DnaCommitDto {
  @ApiProperty({ type: String })
  sha!: string;

  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ type: String })
  authorName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  committedAt!: Date;
}

export class DnaProfileResponseDto {
  @ApiProperty({ type: String })
  subjectType!: string;

  @ApiProperty({ type: String })
  subjectId!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  path!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  firstRevision!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  lastRevision!: string | null;

  @ApiProperty({ type: String, format: 'date-time', required: false, nullable: true })
  firstSeenAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', required: false, nullable: true })
  lastChangedAt!: Date | null;

  @ApiProperty({ type: Number })
  changeCount!: number;

  @ApiProperty({ type: Number })
  fanIn!: number;

  @ApiProperty({ type: Number })
  fanOut!: number;

  @ApiProperty({ type: Number })
  complexity!: number;

  @ApiProperty({ type: Number })
  loc!: number;

  @ApiProperty({ type: Number })
  dependencyCount!: number;

  @ApiProperty({ type: String })
  coupling!: string;

  @ApiProperty({ type: String })
  complexityLabel!: string;

  @ApiProperty({ type: () => DnaRiskDto })
  risk!: DnaRiskDto;

  @ApiProperty({ type: () => [DnaContributorDto] })
  contributors!: DnaContributorDto[];

  @ApiProperty({ type: () => [DnaVersionDto] })
  versions!: DnaVersionDto[];

  @ApiProperty({ type: () => [DnaCommitDto] })
  relatedCommits!: DnaCommitDto[];
}

export class InsightItemDto {
  @ApiProperty({ type: String })
  subjectType!: string;

  @ApiProperty({ type: String })
  subjectId!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  path!: string | null;

  @ApiProperty({ type: Number })
  score!: number;

  @ApiProperty({ type: String })
  level!: string;

  @ApiProperty({ type: Number })
  changeCount!: number;

  @ApiProperty({ type: Number })
  complexity!: number;

  @ApiProperty({ type: Number })
  fanIn!: number;
}

export class InsightListResponseDto {
  @ApiProperty({ type: () => [InsightItemDto] })
  items!: InsightItemDto[];
}

export class DnaHealthResponseDto {
  @ApiProperty({ type: String, required: false, nullable: true })
  revision!: string | null;

  @ApiProperty({ type: Number })
  fileCount!: number;

  @ApiProperty({ type: Number })
  hotspotCount!: number;

  @ApiProperty({ type: Number })
  highRiskCount!: number;

  @ApiProperty({ type: Number })
  averageComplexity!: number;
}
