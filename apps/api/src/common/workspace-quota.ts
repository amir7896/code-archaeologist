import { ApiErrors } from './api-exception';

export async function assertDailyQuota(
  used: number,
  limit: number,
  code: string,
  message: string,
): Promise<void> {
  if (used >= limit) {
    throw ApiErrors.tooManyRequests(code, message);
  }
}

export function dayAgo(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

export async function assertWorkspaceSyncQuota(
  countRecent: () => Promise<number>,
  limit: number,
): Promise<void> {
  await assertDailyQuota(
    await countRecent(),
    limit,
    'WORKSPACE_SYNC_QUOTA',
    'This workspace has reached its daily analysis limit. Try again tomorrow.',
  );
}

export async function assertWorkspaceAskQuota(
  countRecent: () => Promise<number>,
  limit: number,
): Promise<void> {
  await assertDailyQuota(
    await countRecent(),
    limit,
    'WORKSPACE_ASK_QUOTA',
    'This workspace has reached its daily Ask limit. Try again tomorrow.',
  );
}
