import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationMetaDto, PaginationQueryDto } from '../../common/pagination.dto';

export class FileTreeQueryDto {
  @ApiPropertyOptional({ type: String, maxLength: 400 })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  prefix?: string;

  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

export class FileTreeNodeDto {
  @ApiProperty({ type: String })
  kind!: 'folder' | 'file';

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiPropertyOptional({ type: Number })
  fileCount?: number;

  @ApiPropertyOptional({ type: String })
  fileId?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  language?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  loc?: number | null;
}

export class FileTreeResponseDto {
  @ApiProperty({ type: String })
  prefix!: string;

  @ApiProperty({ type: String })
  q!: string;

  @ApiProperty({ type: () => [FileTreeNodeDto] })
  items!: FileTreeNodeDto[];
}

export class FileListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ type: String, maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string;
}

export class SymbolListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ type: String, maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  kind?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(1)
  fileId?: string;
}

export class SourceFileResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  language!: string | null;

  @ApiProperty({ type: Number, required: false, nullable: true })
  size!: number | null;

  @ApiProperty({ type: Number, required: false, nullable: true })
  loc!: number | null;

  @ApiProperty({ type: Number, required: false, nullable: true })
  complexity!: number | null;

  @ApiProperty({ type: Number })
  symbolCount!: number;

  @ApiProperty({ type: String, required: false, nullable: true })
  lastRevision!: string | null;
}

export class SourceFileListResponseDto {
  @ApiProperty({ type: () => [SourceFileResponseDto] })
  items!: SourceFileResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class SourcePreviewResponseDto {
  @ApiProperty({ type: String })
  fileId!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  language!: string | null;

  @ApiProperty({ type: String })
  content!: string;

  @ApiProperty({ type: Boolean })
  truncated!: boolean;
}

export class SymbolRelationResponseDto {
  @ApiProperty({ type: String })
  type!: string;

  @ApiProperty({ type: String })
  targetQualifiedName!: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  targetSymbolId!: string | null;

  @ApiProperty({ type: Number })
  confidence!: number;
}

export class SymbolResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  fileId!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: String })
  kind!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  qualifiedName!: string;

  @ApiProperty({ type: Number })
  startLine!: number;

  @ApiProperty({ type: Number })
  endLine!: number;

  @ApiProperty({ type: Number })
  loc!: number;

  @ApiProperty({ type: Number })
  complexity!: number;

  @ApiProperty({ type: Number })
  nesting!: number;
}

export class SymbolDetailResponseDto extends SymbolResponseDto {
  @ApiProperty({ type: String, required: false, nullable: true })
  parentSymbolId!: string | null;

  @ApiProperty({ type: () => [SymbolRelationResponseDto] })
  relations!: SymbolRelationResponseDto[];
}

export class SymbolListResponseDto {
  @ApiProperty({ type: () => [SymbolResponseDto] })
  items!: SymbolResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
