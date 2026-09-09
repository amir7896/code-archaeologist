import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationMetaDto } from '../../common/pagination.dto';

export const CREDENTIAL_TYPES = ['HTTPS_TOKEN'] as const;

export class RepositoryCredentialInputDto {
  @ApiProperty({ type: String, enum: CREDENTIAL_TYPES, example: 'HTTPS_TOKEN' })
  @IsIn(CREDENTIAL_TYPES)
  type!: (typeof CREDENTIAL_TYPES)[number];

  @ApiPropertyOptional({ type: String, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  username?: string;

  @ApiProperty({ type: String, minLength: 1, maxLength: 4096, example: 'ghp_example_access_token' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  secret!: string;
}

export class CreateRepositoryDto {
  @ApiProperty({ type: String, example: 'https://github.com/amir7896/fastapi-nexus.git' })
  @IsString()
  @MinLength(12)
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({ type: String, maxLength: 80, example: 'Nexus Backend' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ type: String, maxLength: 120, example: 'main' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  defaultBranch?: string;

  @ApiPropertyOptional({ type: () => RepositoryCredentialInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RepositoryCredentialInputDto)
  credential?: RepositoryCredentialInputDto;
}

export class UpdateRepositoryDto {
  @ApiPropertyOptional({ type: String, maxLength: 80, example: 'Nexus Backend' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ type: String, maxLength: 120, example: 'main' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  defaultBranch?: string;

  @ApiPropertyOptional({ type: () => RepositoryCredentialInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RepositoryCredentialInputDto)
  credential?: RepositoryCredentialInputDto;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  removeCredential?: boolean;
}

export class SyncRepositoryDto {
  @ApiPropertyOptional({
    type: String,
    maxLength: 120,
    description: 'Branch or revision to sync',
    example: 'main',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  revision?: string;
}

export class AnalysisTaskResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  taskType!: string;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: Number })
  attempts!: number;

  @ApiProperty({ type: String, required: false, nullable: true })
  error!: string | null;
}

export class AnalysisRunResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  revision!: string | null;

  @ApiProperty({ type: String })
  type!: string;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: Number })
  progress!: number;

  @ApiProperty({ type: String, required: false, nullable: true })
  error!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: () => [AnalysisTaskResponseDto] })
  tasks!: AnalysisTaskResponseDto[];
}

export class RepositoryResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  workspaceId!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  url!: string;

  @ApiProperty({ type: String })
  provider!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  defaultBranch!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  currentRevision!: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  lastIndexedRevision!: string | null;

  @ApiProperty({ type: Number, required: false })
  commitCount?: number;

  @ApiProperty({ type: Number, required: false })
  branchCount?: number;

  @ApiProperty({ type: Number, required: false })
  fileCount?: number;

  @ApiProperty({ type: Number, required: false })
  symbolCount?: number;

  @ApiProperty({ type: String, required: false, nullable: true })
  lastParsedRevision?: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  lastGraphRevision?: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  lastDnaRevision?: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  lastEvidenceRevision?: string | null;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: Boolean })
  hasCredential!: boolean;

  @ApiProperty({ type: String, required: false, nullable: true })
  lastError!: string | null;

  @ApiProperty({ type: String, format: 'date-time', required: false, nullable: true })
  lastSyncedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: () => AnalysisRunResponseDto, required: false, nullable: true })
  latestRun!: AnalysisRunResponseDto | null;
}

export class RepositoryListResponseDto {
  @ApiProperty({ type: () => [RepositoryResponseDto] })
  items!: RepositoryResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class RepositoryStatusResponseDto extends RepositoryResponseDto {}
