import {
  createClient,
  exitCodeForError,
  type CodeArchaeologistClient,
  type CreateClientOptions,
} from '@code-archaeologist/sdk';
import { EXIT } from './exit';
import { type ResolvedConfig, saveUserConfig } from './config';

export type ClientFactory = (options: CreateClientOptions) => CodeArchaeologistClient;

export function createAuthedClient(
  config: ResolvedConfig,
  create: ClientFactory = createClient,
): CodeArchaeologistClient {
  return create({
    baseUrl: config.apiUrl,
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    onTokens: (tokens) => {
      saveUserConfig(config.userConfigPath, {
        apiUrl: config.apiUrl,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    },
  });
}

export function requireScope(config: ResolvedConfig): { workspaceId: string; repositoryId: string } {
  if (!config.workspaceId || !config.repositoryId) {
    throw Object.assign(new Error('Set --workspace and --repository, or run init first'), {
      exitCode: EXIT.usage,
      code: 'USAGE',
    });
  }
  return { workspaceId: config.workspaceId, repositoryId: config.repositoryId };
}

export function mapError(error: unknown): { exitCode: number; code: string; message: string } {
  if (error && typeof error === 'object' && 'exitCode' in error) {
    const coded = error as { exitCode: number; code?: string; message: string };
    return {
      exitCode: coded.exitCode,
      code: coded.code ?? 'ERROR',
      message: coded.message,
    };
  }
  return {
    exitCode: exitCodeForError(error),
    code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'ERROR',
    message: error instanceof Error ? error.message : 'Command failed',
  };
}
