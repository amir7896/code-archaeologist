import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class GraphWalkQueryDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  fileId!: string;

  @ApiPropertyOptional({ type: Number, default: 2, minimum: 1, maximum: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  depth = 2;
}

export class GraphMapFileDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  path!: string;
}

export class GraphModuleDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: Number })
  fileCount!: number;

  @ApiProperty({ type: Number })
  fanIn!: number;

  @ApiProperty({ type: Number })
  fanOut!: number;

  @ApiProperty({ type: Boolean })
  inCycle!: boolean;

  @ApiProperty({ type: () => [GraphMapFileDto] })
  files!: GraphMapFileDto[];
}

export class GraphMapEdgeDto {
  @ApiProperty({ type: String })
  sourceId!: string;

  @ApiProperty({ type: String })
  targetId!: string;

  @ApiProperty({ type: String })
  type!: string;

  @ApiProperty({ type: Number })
  weight!: number;

  @ApiProperty({ type: Number })
  confidence!: number;
}

export class GraphCycleDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: [String] })
  nodes!: string[];
}

export class GraphStatsDto {
  @ApiProperty({ type: Number })
  fileCount!: number;

  @ApiProperty({ type: Number })
  moduleCount!: number;

  @ApiProperty({ type: Number })
  edgeCount!: number;

  @ApiProperty({ type: Number })
  cycleCount!: number;

  @ApiProperty({ type: Number })
  unresolvedImportCount!: number;
}

export class GraphMapResponseDto {
  @ApiProperty({ type: String, required: false, nullable: true })
  revision!: string | null;

  @ApiProperty({ type: () => [GraphModuleDto] })
  modules!: GraphModuleDto[];

  @ApiProperty({ type: () => [GraphMapEdgeDto] })
  edges!: GraphMapEdgeDto[];

  @ApiProperty({ type: () => [GraphCycleDto] })
  cycles!: GraphCycleDto[];

  @ApiProperty({ type: () => GraphStatsDto })
  stats!: GraphStatsDto;
}

export class GraphNeighborDto {
  @ApiProperty({ type: String })
  fileId!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: Number })
  depth!: number;
}

export class GraphNeighborsResponseDto {
  @ApiProperty({ type: String })
  fileId!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiProperty({ type: String })
  direction!: string;

  @ApiProperty({ type: Number })
  depth!: number;

  @ApiProperty({ type: () => [GraphNeighborDto] })
  items!: GraphNeighborDto[];
}

export class GraphFileCycleNodeDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  path!: string;
}

export class GraphFileCycleDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: () => [GraphFileCycleNodeDto] })
  nodes!: GraphFileCycleNodeDto[];
}

export class GraphCyclesResponseDto {
  @ApiProperty({ type: () => [GraphCycleDto] })
  modules!: GraphCycleDto[];

  @ApiProperty({ type: () => [GraphFileCycleDto] })
  files!: GraphFileCycleDto[];
}
