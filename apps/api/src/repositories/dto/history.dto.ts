import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationMetaDto, PaginationQueryDto } from '../../common/pagination.dto';

export class CommitListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String, maxLength: 240 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  branch?: string;
}

export class FileHistoryQueryDto extends PaginationQueryDto {
  @ApiProperty({ type: String, maxLength: 1024, example: 'alembic/env.py' })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  path!: string;
}

export class BranchResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  headSha!: string | null;

  @ApiProperty({ type: Boolean })
  isDefault!: boolean;
}

export class BranchListResponseDto {
  @ApiProperty({ type: () => [BranchResponseDto] })
  items!: BranchResponseDto[];
}

export class CommitSummaryDto {
  @ApiProperty({ type: String })
  sha!: string;

  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ type: String })
  authorName!: string;

  @ApiProperty({ type: String })
  authorEmail!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  authoredAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  committedAt!: Date;

  @ApiProperty({ type: [String] })
  parentShas!: string[];

  @ApiProperty({ type: Boolean })
  isMerge!: boolean;

  @ApiProperty({ type: Number })
  additions!: number;

  @ApiProperty({ type: Number })
  deletions!: number;

  @ApiProperty({ type: Number })
  changedFileCount!: number;
}

export class CommitListResponseDto {
  @ApiProperty({ type: () => [CommitSummaryDto] })
  items!: CommitSummaryDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class CommitFileResponseDto {
  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  oldPath!: string | null;

  @ApiProperty({ type: String })
  changeType!: string;

  @ApiProperty({ type: Number })
  additions!: number;

  @ApiProperty({ type: Number })
  deletions!: number;

  @ApiProperty({ type: Number, required: false, nullable: true })
  similarity!: number | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  language!: string | null;
}

export class CommitDetailResponseDto extends CommitSummaryDto {
  @ApiProperty({ type: () => [CommitFileResponseDto] })
  files!: CommitFileResponseDto[];
}

export class FileHistoryItemDto {
  @ApiProperty({ type: String })
  sha!: string;

  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ type: String })
  authorName!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  committedAt!: Date;

  @ApiProperty({ type: String })
  changeType!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  oldPath!: string | null;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: Number })
  additions!: number;

  @ApiProperty({ type: Number })
  deletions!: number;
}

export class FileHistoryResponseDto {
  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: () => [FileHistoryItemDto] })
  items!: FileHistoryItemDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
