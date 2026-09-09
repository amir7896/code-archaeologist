import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationMetaDto, PaginationQueryDto } from '../../common/pagination.dto';

export class CreateInvestigationDto {
  @ApiProperty({ type: String, minLength: 8, maxLength: 2000 })
  @IsString()
  @MinLength(8)
  @MaxLength(2000)
  question!: string;

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

export class InvestigationEvidenceDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  sourceType!: string;

  @ApiProperty({ type: String })
  sourceId!: string;

  @ApiProperty({ type: String })
  citation!: string;

  @ApiProperty({ type: String })
  excerpt!: string;

  @ApiProperty({ type: Number })
  relevance!: number;

  @ApiProperty({ type: String, required: false, nullable: true })
  fileId!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  symbolId!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  commitSha!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  path!: string | null;
}

export class InvestigationMessageDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  role!: string;

  @ApiProperty({ type: String })
  content!: string;

  @ApiProperty({ type: Number, required: false, nullable: true })
  promptTokens!: number | null;

  @ApiProperty({ type: Number, required: false, nullable: true })
  completionTokens!: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class InvestigationResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  repositoryId!: string;

  @ApiProperty({ type: String })
  question!: string;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: String })
  model!: string;

  @ApiProperty({ type: Boolean })
  usedModel!: boolean;

  @ApiProperty({ type: Number, required: false, nullable: true })
  confidence!: number | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  confidenceLabel!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  subjectFileId!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  subjectSymbolId!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  error!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: () => [InvestigationMessageDto], required: false })
  messages?: InvestigationMessageDto[];

  @ApiProperty({ type: () => [InvestigationEvidenceDto], required: false })
  evidence?: InvestigationEvidenceDto[];
}

export class InvestigationListResponseDto {
  @ApiProperty({ type: () => [InvestigationResponseDto] })
  items!: InvestigationResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class InvestigationListQueryDto extends PaginationQueryDto {}

export class AiStatusResponseDto {
  @ApiProperty({ type: String })
  provider!: string;

  @ApiProperty({ type: String })
  model!: string;

  @ApiProperty({ type: Boolean })
  available!: boolean;
}
