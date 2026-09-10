import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

export type ProjectConfig = {
  apiUrl?: string;
  workspaceId?: string;
  repositoryId?: string;
};

export type UserConfig = ProjectConfig & {
  accessToken?: string;
  refreshToken?: string;
};

export type ResolvedConfig = {
  apiUrl: string;
  workspaceId?: string;
  repositoryId?: string;
  accessToken?: string;
  refreshToken?: string;
  email?: string;
  password?: string;
  userConfigPath: string;
  projectConfigPath: string;
};

const DEFAULT_API = 'http://127.0.0.1:3000';

export function userConfigPath(env: NodeJS.ProcessEnv): string {
  if (env.CA_CONFIG) {
    return env.CA_CONFIG;
  }
  const root = env.XDG_CONFIG_HOME?.trim() || join(homedir(), '.config');
  return join(root, 'code-archaeologist', 'config.json');
}

export function projectConfigPath(cwd: string): string {
  return join(cwd, '.code-archaeologist.json');
}

export function readJsonFile<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function writeJsonFile(path: string, value: unknown, mode = 0o600): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode });
  chmodSync(path, mode);
}

export function resolveConfig(
  env: NodeJS.ProcessEnv,
  cwd: string,
  flags: { api?: string; workspace?: string; repository?: string },
): ResolvedConfig {
  const userPath = userConfigPath(env);
  const projectPath = projectConfigPath(cwd);
  const user = readJsonFile<UserConfig>(userPath) ?? {};
  const project = readJsonFile<ProjectConfig>(projectPath) ?? {};

  return {
    apiUrl:
      flags.api ||
      env.CA_API_URL ||
      env.CODE_ARCHAEOLOGIST_API_URL ||
      project.apiUrl ||
      user.apiUrl ||
      DEFAULT_API,
    workspaceId: flags.workspace || env.CA_WORKSPACE_ID || project.workspaceId || user.workspaceId,
    repositoryId: flags.repository || env.CA_REPOSITORY_ID || project.repositoryId || user.repositoryId,
    accessToken: env.CA_ACCESS_TOKEN || user.accessToken,
    refreshToken: env.CA_REFRESH_TOKEN || user.refreshToken,
    email: env.CA_EMAIL,
    password: env.CA_PASSWORD,
    userConfigPath: userPath,
    projectConfigPath: projectPath,
  };
}

export function saveUserConfig(path: string, next: UserConfig): void {
  const current = readJsonFile<UserConfig>(path) ?? {};
  writeJsonFile(path, { ...current, ...next }, 0o600);
}

export function saveProjectConfig(path: string, next: ProjectConfig): void {
  const current = readJsonFile<ProjectConfig>(path) ?? {};
  const merged: ProjectConfig = { ...current, ...next };
  writeJsonFile(path, merged, 0o644);
}
