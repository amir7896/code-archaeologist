import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class PaginationMetaDto {
  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 20 })
  limit!: number;

  @ApiProperty({ type: Number, example: 0 })
  total!: number;

  @ApiProperty({ type: Number, example: 1 })
  totalPages!: number;
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMetaDto {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function paginationSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function resolvePagination(query: PaginationQueryDto): { page: number; limit: number } {
  return {
    page: query.page || 1,
    limit: query.limit || 20,
  };
}
