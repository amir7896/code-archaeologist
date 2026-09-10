import { ApiException } from './api-exception';
import { assertWorkspaceAskQuota, assertWorkspaceSyncQuota } from './workspace-quota';

describe('workspace quota', () => {
  it('allows syncs under the daily cap', async () => {
    await expect(assertWorkspaceSyncQuota(async () => 3, 40)).resolves.toBeUndefined();
  });

  it('rejects syncs at the daily cap', async () => {
    await expect(assertWorkspaceSyncQuota(async () => 40, 40)).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects Ask when the daily cap is reached', async () => {
    await expect(assertWorkspaceAskQuota(async () => 80, 80)).rejects.toBeInstanceOf(ApiException);
  });
});
