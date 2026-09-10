import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationMetaDto } from '../../common/pagination.dto';

export class ConnectGithubDto {
  @ApiProperty({ type: String, minLength: 8, maxLength: 512, example: 'ghp_exampletoken' })
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token!: string;
}

export class GithubOAuthDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  code!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  state!: string;
}

export class GithubAuthorizeResponseDto {
  @ApiProperty({ type: String })
  url!: string;
}

export class GithubIntegrationResponseDto {
  @ApiProperty({ type: String, enum: ['GITHUB'] })
  provider!: 'GITHUB';

  @ApiProperty({ type: Boolean })
  connected!: boolean;

  @ApiProperty({ type: Boolean })
  oauthAvailable!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  accountLogin!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  lastSyncedAt!: Date | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  lastError!: string | null;

  @ApiProperty({ type: String })
  webhookUrl!: string;

  @ApiProperty({ type: Boolean })
  webhookConfigured!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  webhookSecret!: string | null;
}

export class ThreadLinkResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  method!: string;

  @ApiProperty({ type: Number })
  confidence!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  path!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  excerpt!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  fileId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  symbolId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  commitId!: string | null;
}

export class ThreadResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, enum: ['ISSUE', 'PULL_REQUEST'] })
  kind!: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  number!: number | null;

  @ApiProperty({ type: String })
  title!: string;

  @ApiProperty({ type: String })
  state!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  authorLogin!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  url!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  mergedAt!: Date | null;

  @ApiProperty({ type: Number })
  reviewCount!: number;

  @ApiProperty({ type: Number })
  linkCount!: number;
}

export class ThreadDetailResponseDto extends ThreadResponseDto {
  @ApiProperty({ type: String })
  body!: string;

  @ApiProperty({ type: [ThreadLinkResponseDto] })
  links!: ThreadLinkResponseDto[];

  @ApiProperty({ type: [String] })
  commitShas!: string[];
}

export class ThreadListResponseDto {
  @ApiProperty({ type: [ThreadResponseDto] })
  items!: ThreadResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class ThreadListQueryDto {
  @ApiPropertyOptional({ type: String, enum: ['ISSUE', 'PULL_REQUEST'] })
  @IsOptional()
  @IsString()
  @IsIn(['ISSUE', 'PULL_REQUEST'])
  kind?: 'ISSUE' | 'PULL_REQUEST';

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ type: Number, default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class WebhookAckDto {
  @ApiProperty({ type: String })
  status!: string;
}
