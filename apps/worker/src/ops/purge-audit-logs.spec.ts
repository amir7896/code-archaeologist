import { purgeExpiredAuditLogs } from './purge-audit-logs';

describe('purgeExpiredAuditLogs', () => {
  it('deletes rows older than the retention window', async () => {
    const prisma = {
      auditLog: { deleteMany: jest.fn().mockResolvedValue({ count: 4 }) },
    };
    const logger = { log: jest.fn() };
    await expect(purgeExpiredAuditLogs(prisma, 90, logger)).resolves.toBe(4);
    expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: expect.any(Date) } },
    });
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('4'));
  });
});
