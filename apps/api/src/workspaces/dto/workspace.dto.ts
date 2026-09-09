import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationMetaDto } from '../../common/pagination.dto';

export const ASSIGNABLE_ROLES = ['ADMIN', 'ANALYST', 'VIEWER'] as const;
export const WORKSPACE_STATUSES = ['ACTIVE', 'ARCHIVED'] as const;

export class CreateWorkspaceDto {
  @ApiProperty({ type: String, example: 'Platform', minLength: 1, maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

export class UpdateWorkspaceDto {
  @ApiPropertyOptional({ type: String, minLength: 1, maxLength: 80, example: 'Platform Research' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({ type: String, enum: WORKSPACE_STATUSES, example: 'ACTIVE' })
  @IsOptional()
  @IsIn(WORKSPACE_STATUSES)
  status?: (typeof WORKSPACE_STATUSES)[number];
}

export class InviteMemberDto {
  @ApiProperty({ type: String, example: 'analyst@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String, enum: ASSIGNABLE_ROLES, example: 'ANALYST' })
  @IsIn(ASSIGNABLE_ROLES)
  role!: (typeof ASSIGNABLE_ROLES)[number];
}

export class UpdateMemberDto {
  @ApiProperty({ type: String, enum: ASSIGNABLE_ROLES, example: 'VIEWER' })
  @IsIn(ASSIGNABLE_ROLES)
  role!: (typeof ASSIGNABLE_ROLES)[number];
}

export class WorkspaceResponseDto {
  @ApiProperty({ type: String, example: '3619367b-119f-48fe-b21c-0138b04f69bc' })
  id!: string;

  @ApiProperty({ type: String, example: 'Platform' })
  name!: string;

  @ApiProperty({ type: String, example: 'platform' })
  slug!: string;

  @ApiProperty({ type: String })
  ownerId!: string;

  @ApiProperty({ type: String, enum: WORKSPACE_STATUSES })
  status!: string;

  @ApiProperty({ type: String, enum: ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'] })
  role!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class WorkspaceListResponseDto {
  @ApiProperty({ type: () => [WorkspaceResponseDto] })
  items!: WorkspaceResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class MemberResponseDto {
  @ApiProperty({ type: String })
  userId!: string;

  @ApiProperty({ type: String })
  email!: string;

  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String, enum: ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'] })
  role!: string;

  @ApiProperty({ type: String, enum: ['ACTIVE', 'INVITED'] })
  status!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class MemberListResponseDto {
  @ApiProperty({ type: () => [MemberResponseDto] })
  items!: MemberResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class AuditLogResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  action!: string;

  @ApiProperty({ type: String })
  resource!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>;

  @ApiProperty({ type: String, required: false, nullable: true })
  userId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: () => [AuditLogResponseDto] })
  items!: AuditLogResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
