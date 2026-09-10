type AuditPrisma = {
  auditLog: {
    deleteMany: (args: { where: { createdAt: { lt: Date } } }) => Promise<{ count: number }>;
  };
};

type LoggerLike = {
  log(message: string): void;
};

export async function purgeExpiredAuditLogs(
  prisma: AuditPrisma,
  retentionDays: number,
  logger?: LoggerLike,
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (result.count > 0) {
    logger?.log(`Purged ${result.count} audit logs older than ${retentionDays} days`);
  }
  return result.count;
}
