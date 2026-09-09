import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class EvidenceSubjectQueryDto {
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
}

export class EvidenceResolveQueryDto extends EvidenceSubjectQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  revision?: string;
}

export class EvidenceOriginDto {
  @ApiProperty({ type: String, enum: ['FILE', 'SYMBOL'] })
  subjectType!: 'FILE' | 'SYMBOL';

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
}

export class EvidenceCommitDto {
  @ApiProperty({ type: String })
  sha!: string;

  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ type: String })
  authorName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  committedAt!: Date;
}

export class EvidenceItemDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  kind!: string;

  @ApiProperty({ type: String })
  method!: string;

  @ApiProperty({ type: String })
  subjectType!: string;

  @ApiProperty({ type: String })
  subjectId!: string;

  @ApiProperty({ type: Number })
  confidence!: number;

  @ApiProperty({ type: String })
  confidenceLabel!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  excerpt!: string | null;

  @ApiProperty({ type: Object })
  details!: Record<string, unknown>;

  @ApiProperty({ type: () => EvidenceCommitDto, required: false, nullable: true })
  commit!: EvidenceCommitDto | null;
}

export class EvidenceListResponseDto {
  @ApiProperty({ type: String, required: false, nullable: true })
  revision!: string | null;

  @ApiProperty({ type: () => EvidenceOriginDto })
  origin!: EvidenceOriginDto;

  @ApiProperty({ type: String })
  note!: string;

  @ApiProperty({ type: () => [EvidenceItemDto] })
  items!: EvidenceItemDto[];
}

export class EvidenceVersionDto {
  @ApiProperty({ type: String })
  revision!: string;

  @ApiProperty({ type: String })
  contentHash!: string;

  @ApiProperty({ type: String })
  changeType!: string;

  @ApiProperty({ type: Number })
  startLine!: number;

  @ApiProperty({ type: Number })
  endLine!: number;

  @ApiProperty({ type: String, required: false, nullable: true })
  commitSha!: string | null;
}

export class EvidenceResolveResponseDto {
  @ApiProperty({ type: String, required: false, nullable: true })
  revision!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  requestedRevision!: string | null;

  @ApiProperty({ type: Boolean })
  matched!: boolean;

  @ApiProperty({ type: () => EvidenceOriginDto })
  origin!: EvidenceOriginDto;

  @ApiProperty({ type: String })
  note!: string;

  @ApiProperty({ type: () => [EvidenceItemDto] })
  items!: EvidenceItemDto[];

  @ApiProperty({ type: () => [EvidenceVersionDto] })
  versions!: EvidenceVersionDto[];
}

export class EvolutionEventDto {
  @ApiProperty({ type: String })
  sha!: string;

  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ type: String })
  authorName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  committedAt!: Date;

  @ApiProperty({ type: String })
  method!: string;

  @ApiProperty({ type: Number })
  confidence!: number;

  @ApiProperty({ type: String })
  confidenceLabel!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  changeType!: string | null;

  @ApiProperty({ type: Number })
  additions!: number;

  @ApiProperty({ type: Number })
  deletions!: number;

  @ApiProperty({ type: Number })
  overlapLines!: number;
}

export class EvolutionStatsDto {
  @ApiProperty({ type: Number })
  commitCount!: number;

  @ApiProperty({ type: Number })
  strongCount!: number;

  @ApiProperty({ type: Number })
  likelyCount!: number;

  @ApiProperty({ type: Number })
  possibleCount!: number;

  @ApiProperty({ type: Number })
  versionCount!: number;
}

export class EvolutionResponseDto {
  @ApiProperty({ type: String, required: false, nullable: true })
  revision!: string | null;

  @ApiProperty({ type: () => EvidenceOriginDto })
  origin!: EvidenceOriginDto;

  @ApiProperty({ type: String })
  note!: string;

  @ApiProperty({ type: () => EvolutionStatsDto })
  stats!: EvolutionStatsDto;

  @ApiProperty({ type: () => [EvolutionEventDto] })
  timeline!: EvolutionEventDto[];

  @ApiProperty({ type: () => [EvidenceVersionDto] })
  versions!: EvidenceVersionDto[];
}
