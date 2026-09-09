import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@code-archaeologist/core';
import { PrismaService } from '../database/prisma.service';

export type AuditInput = {
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          workspaceId: input.workspaceId ?? null,
          userId: input.userId ?? null,
          action: input.action,
          resource: input.resource,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write audit log ${input.action}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
