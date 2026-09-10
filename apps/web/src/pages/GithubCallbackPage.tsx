import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { integrationApi } from '../api';
import { errorMessage } from '../lib/errors';
import { workspaceSettingsPath } from '../lib/paths';
import { muted, primaryButton } from '../ui';

const OAUTH_WORKSPACE_KEY = 'ca.github.oauth.workspace';

export function rememberGithubOAuthWorkspace(workspaceId: string): void {
  sessionStorage.setItem(OAUTH_WORKSPACE_KEY, workspaceId);
}

export function GithubCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const code = params.get('code') ?? '';
  const state = params.get('state') ?? '';

  useEffect(() => {
    const workspaceId = sessionStorage.getItem(OAUTH_WORKSPACE_KEY);
    if (!code || !state) {
      setError('GitHub did not return an authorization code.');
      return;
    }
    if (!workspaceId) {
      setError('Start GitHub authorization from workspace settings.');
      return;
    }
    void integrationApi
      .finishGithubOAuth(workspaceId, { code, state })
      .then(() => {
        sessionStorage.removeItem(OAUTH_WORKSPACE_KEY);
        navigate(`${workspaceSettingsPath(workspaceId)}?tab=integrations`, { replace: true });
      })
      .catch((reason: unknown) => {
        setError(errorMessage(reason, 'GitHub authorization failed.'));
      });
  }, [code, navigate, state]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink p-8 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold text-white">Connecting GitHub</h1>
        <p className={`mt-3 ${muted}`}>{error ?? 'Finishing authorization…'}</p>
        {error ? (
          <Link className={`${primaryButton} mt-6`} to="/home">
            Back to home
          </Link>
        ) : null}
      </div>
    </main>
  );
}
