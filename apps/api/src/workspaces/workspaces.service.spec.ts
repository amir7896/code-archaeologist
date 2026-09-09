import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  const actor = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', sessionId: 'sid' };
  const workspace = {
    id: 'ws-1',
    name: 'Platform',
    slug: 'platform-abc',
    ownerId: actor.id,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  function createService(prisma: Record<string, unknown>) {
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    return {
      service: new WorkspacesService(prisma as never, audit as never),
      audit,
    };
  }

  it('refuses to change the owner role', async () => {
    const { service } = createService({
      workspace: { findFirst: jest.fn().mockResolvedValue(workspace) },
      workspaceMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER', userId: actor.id }),
      },
    });

    await expect(
      service.updateMember('ws-1', actor.id, actor, 'OWNER', { role: 'ADMIN' }),
    ).rejects.toMatchObject({ response: { code: 'AUTH_FORBIDDEN' } });
  });

  it('blocks member mutations on archived workspaces', async () => {
    const { service } = createService({
      workspace: { findFirst: jest.fn().mockResolvedValue({ ...workspace, status: 'ARCHIVED' }) },
    });

    await expect(
      service.invite('ws-1', actor, 'OWNER', { email: 'a@example.com', role: 'VIEWER' }),
    ).rejects.toMatchObject({ response: { code: 'WORKSPACE_ARCHIVED' } });
  });

  it('prevents admins from inviting other admins', async () => {
    const { service } = createService({
      workspace: { findFirst: jest.fn().mockResolvedValue(workspace) },
    });

    await expect(
      service.invite('ws-1', { ...actor, id: 'admin-1' }, 'ADMIN', {
        email: 'other@example.com',
        role: 'ADMIN',
      }),
    ).rejects.toMatchObject({ response: { code: 'AUTH_FORBIDDEN' } });
  });
});
