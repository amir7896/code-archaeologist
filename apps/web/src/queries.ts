import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, repositoryApi, workspaceApi, type AuthSession } from './api';
import { sessionCleared, sessionEstablished } from './store/auth-slice';
import { useAppDispatch } from './store/hooks';
import { type AppDispatch } from './store/store';

export const queryKeys = {
  me: ['me'] as const,
  workspaces: ['workspaces'] as const,
  workspace: (id: string) => ['workspaces', id] as const,
  members: (id: string) => ['workspaces', id, 'members'] as const,
  auditLogs: (id: string) => ['workspaces', id, 'audit'] as const,
  repositories: (workspaceId: string) => ['workspaces', workspaceId, 'repositories'] as const,
  repository: (workspaceId: string, repositoryId: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId] as const,
  branches: (workspaceId: string, repositoryId: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'branches'] as const,
  commits: (workspaceId: string, repositoryId: string, branch?: string, page?: number) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'commits', branch ?? '', page ?? 1] as const,
  commit: (workspaceId: string, repositoryId: string, sha: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'commits', sha] as const,
  fileHistory: (workspaceId: string, repositoryId: string, path: string, page?: number) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'files', path, page ?? 1] as const,
  files: (workspaceId: string, repositoryId: string, q?: string, page?: number) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'code', 'files', q ?? '', page ?? 1] as const,
  file: (workspaceId: string, repositoryId: string, fileId: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'code', 'file', fileId] as const,
  filePreview: (workspaceId: string, repositoryId: string, fileId: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'code', 'preview', fileId] as const,
  dna: (workspaceId: string, repositoryId: string, fileId?: string, symbolId?: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'dna', fileId ?? '', symbolId ?? ''] as const,
  dnaHealth: (workspaceId: string, repositoryId: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'insights', 'health'] as const,
  hotspots: (workspaceId: string, repositoryId: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'insights', 'hotspots'] as const,
  risks: (workspaceId: string, repositoryId: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'insights', 'risks'] as const,
  graph: (workspaceId: string, repositoryId: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'graph'] as const,
  graphDependencies: (workspaceId: string, repositoryId: string, fileId: string, depth?: number) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'graph', 'dependencies', fileId, depth ?? 2] as const,
  graphDependents: (workspaceId: string, repositoryId: string, fileId: string, depth?: number) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'graph', 'dependents', fileId, depth ?? 2] as const,
  symbols: (
    workspaceId: string,
    repositoryId: string,
    q?: string,
    kind?: string,
    page?: number,
    fileId?: string,
  ) =>
    [
      'workspaces',
      workspaceId,
      'repositories',
      repositoryId,
      'code',
      'symbols',
      q ?? '',
      kind ?? '',
      page ?? 1,
      fileId ?? '',
    ] as const,
  symbol: (workspaceId: string, repositoryId: string, symbolId: string) =>
    ['workspaces', workspaceId, 'repositories', repositoryId, 'code', 'symbol', symbolId] as const,
};

export function useWorkspacesQuery() {
  return useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: () => workspaceApi.list(),
  });
}

export function useWorkspaceQuery(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.workspace(workspaceId),
    queryFn: () => workspaceApi.get(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useMembersQuery(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.members(workspaceId),
    queryFn: () => workspaceApi.members(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useAuditLogsQuery(workspaceId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.auditLogs(workspaceId),
    queryFn: () => workspaceApi.auditLogs(workspaceId),
    enabled: Boolean(workspaceId) && enabled,
  });
}

export function useLoginMutation() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => authApi.login(body),
    onSuccess: (session) => applySession(session, dispatch, queryClient),
  });
}

export function useRegisterMutation() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string; name: string }) => authApi.register(body),
    onSuccess: (session) => applySession(session, dispatch, queryClient),
  });
}

export function useLogoutMutation() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // Session may already be revoked.
      }
    },
    onSettled: () => {
      dispatch(sessionCleared());
      queryClient.clear();
    },
  });
}

export function useCreateWorkspaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => workspaceApi.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.workspaces }),
  });
}

export function useUpdateWorkspaceMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; status?: 'ACTIVE' | 'ARCHIVED' }) =>
      workspaceApi.update(workspaceId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(workspaceId) }),
      ]);
    },
  });
}

export function useDeleteWorkspaceMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => workspaceApi.remove(workspaceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      queryClient.removeQueries({ queryKey: queryKeys.workspace(workspaceId) });
    },
  });
}

export function useInviteMemberMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role: 'ADMIN' | 'ANALYST' | 'VIEWER' }) =>
      workspaceApi.invite(workspaceId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(workspaceId) }),
      ]);
    },
  });
}

export function useUpdateMemberMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userId: string; role: 'ADMIN' | 'ANALYST' | 'VIEWER' }) =>
      workspaceApi.updateMember(workspaceId, input.userId, input.role),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(workspaceId) }),
      ]);
    },
  });
}

export function useRemoveMemberMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => workspaceApi.removeMember(workspaceId, userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(workspaceId) }),
      ]);
    },
  });
}

export function useRepositoriesQuery(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.repositories(workspaceId),
    queryFn: () => repositoryApi.list(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useRepositoryQuery(workspaceId: string, repositoryId: string) {
  return useQuery({
    queryKey: queryKeys.repository(workspaceId, repositoryId),
    queryFn: () => repositoryApi.status(workspaceId, repositoryId),
    enabled: Boolean(workspaceId && repositoryId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const runStatus = query.state.data?.latestRun?.status;
      return status === 'PENDING' ||
        status === 'SYNCING' ||
        runStatus === 'QUEUED' ||
        runStatus === 'RUNNING'
        ? 2000
        : false;
    },
  });
}

export function useCreateRepositoryMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      url: string;
      name?: string;
      defaultBranch?: string;
      credential?: { type: 'HTTPS_TOKEN'; secret: string };
    }) => repositoryApi.create(workspaceId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.repositories(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs(workspaceId) }),
      ]);
    },
  });
}

export function useUpdateRepositoryMutation(workspaceId: string, repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      defaultBranch?: string;
      credential?: { type: 'HTTPS_TOKEN'; secret: string };
      removeCredential?: boolean;
    }) => repositoryApi.update(workspaceId, repositoryId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.repository(workspaceId, repositoryId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.repositories(workspaceId) }),
      ]);
    },
  });
}

export function useSyncRepositoryMutation(workspaceId: string, repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (revision?: string) =>
      repositoryApi.sync(workspaceId, repositoryId, revision ? { revision } : {}),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.repository(workspaceId, repositoryId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.repositories(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.branches(workspaceId, repositoryId) }),
        queryClient.invalidateQueries({
          queryKey: ['workspaces', workspaceId, 'repositories', repositoryId, 'commits'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['workspaces', workspaceId, 'repositories', repositoryId, 'files'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['workspaces', workspaceId, 'repositories', repositoryId, 'code'],
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.graph(workspaceId, repositoryId),
        }),
        queryClient.invalidateQueries({
          queryKey: ['workspaces', workspaceId, 'repositories', repositoryId, 'dna'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['workspaces', workspaceId, 'repositories', repositoryId, 'insights'],
        }),
      ]);
    },
  });
}

export function useBranchesQuery(workspaceId: string, repositoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.branches(workspaceId, repositoryId),
    queryFn: () => repositoryApi.branches(workspaceId, repositoryId),
    enabled: Boolean(workspaceId && repositoryId) && enabled,
  });
}

export function useCommitsQuery(
  workspaceId: string,
  repositoryId: string,
  query: { branch?: string; page?: number } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.commits(workspaceId, repositoryId, query.branch, query.page),
    queryFn: () => repositoryApi.commits(workspaceId, repositoryId, query),
    enabled: Boolean(workspaceId && repositoryId) && enabled,
  });
}

export function useCommitQuery(workspaceId: string, repositoryId: string, sha: string) {
  return useQuery({
    queryKey: queryKeys.commit(workspaceId, repositoryId, sha),
    queryFn: () => repositoryApi.commit(workspaceId, repositoryId, sha),
    enabled: Boolean(workspaceId && repositoryId && sha),
  });
}

export function useFileHistoryQuery(
  workspaceId: string,
  repositoryId: string,
  path: string,
  page = 1,
) {
  return useQuery({
    queryKey: queryKeys.fileHistory(workspaceId, repositoryId, path, page),
    queryFn: () => repositoryApi.fileHistory(workspaceId, repositoryId, { path, page }),
    enabled: Boolean(workspaceId && repositoryId && path),
  });
}

export function useSourceFilesQuery(
  workspaceId: string,
  repositoryId: string,
  query: { q?: string; page?: number } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.files(workspaceId, repositoryId, query.q, query.page),
    queryFn: () => repositoryApi.files(workspaceId, repositoryId, query),
    enabled: Boolean(workspaceId && repositoryId) && enabled,
  });
}

export function useSourceFileQuery(workspaceId: string, repositoryId: string, fileId: string) {
  return useQuery({
    queryKey: queryKeys.file(workspaceId, repositoryId, fileId),
    queryFn: () => repositoryApi.file(workspaceId, repositoryId, fileId),
    enabled: Boolean(workspaceId && repositoryId && fileId),
  });
}

export function useSourcePreviewQuery(workspaceId: string, repositoryId: string, fileId: string) {
  return useQuery({
    queryKey: queryKeys.filePreview(workspaceId, repositoryId, fileId),
    queryFn: () => repositoryApi.filePreview(workspaceId, repositoryId, fileId),
    enabled: Boolean(workspaceId && repositoryId && fileId),
  });
}

export function useSymbolsQuery(
  workspaceId: string,
  repositoryId: string,
  query: { q?: string; kind?: string; fileId?: string; page?: number } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.symbols(
      workspaceId,
      repositoryId,
      query.q,
      query.kind,
      query.page,
      query.fileId,
    ),
    queryFn: () => repositoryApi.symbols(workspaceId, repositoryId, query),
    enabled: Boolean(workspaceId && repositoryId) && enabled,
  });
}

export function useDnaHealthQuery(workspaceId: string, repositoryId: string) {
  return useQuery({
    queryKey: queryKeys.dnaHealth(workspaceId, repositoryId),
    queryFn: () => repositoryApi.dnaHealth(workspaceId, repositoryId),
    enabled: Boolean(workspaceId && repositoryId),
  });
}

export function useHotspotsQuery(workspaceId: string, repositoryId: string) {
  return useQuery({
    queryKey: queryKeys.hotspots(workspaceId, repositoryId),
    queryFn: () => repositoryApi.hotspots(workspaceId, repositoryId),
    enabled: Boolean(workspaceId && repositoryId),
  });
}

export function useRisksQuery(workspaceId: string, repositoryId: string) {
  return useQuery({
    queryKey: queryKeys.risks(workspaceId, repositoryId),
    queryFn: () => repositoryApi.risks(workspaceId, repositoryId),
    enabled: Boolean(workspaceId && repositoryId),
  });
}

export function useDnaProfileQuery(
  workspaceId: string,
  repositoryId: string,
  query: { fileId?: string; symbolId?: string } = {},
) {
  return useQuery({
    queryKey: queryKeys.dna(workspaceId, repositoryId, query.fileId, query.symbolId),
    queryFn: () => repositoryApi.dna(workspaceId, repositoryId, query),
    enabled: Boolean(workspaceId && repositoryId && (query.fileId || query.symbolId)),
  });
}

export function useGraphMapQuery(workspaceId: string, repositoryId: string) {
  return useQuery({
    queryKey: queryKeys.graph(workspaceId, repositoryId),
    queryFn: () => repositoryApi.graph(workspaceId, repositoryId),
    enabled: Boolean(workspaceId && repositoryId),
  });
}

export function useGraphDependenciesQuery(
  workspaceId: string,
  repositoryId: string,
  fileId: string,
  depth = 2,
) {
  return useQuery({
    queryKey: queryKeys.graphDependencies(workspaceId, repositoryId, fileId, depth),
    queryFn: () => repositoryApi.graphDependencies(workspaceId, repositoryId, { fileId, depth }),
    enabled: Boolean(workspaceId && repositoryId && fileId),
  });
}

export function useGraphDependentsQuery(
  workspaceId: string,
  repositoryId: string,
  fileId: string,
  depth = 2,
) {
  return useQuery({
    queryKey: queryKeys.graphDependents(workspaceId, repositoryId, fileId, depth),
    queryFn: () => repositoryApi.graphDependents(workspaceId, repositoryId, { fileId, depth }),
    enabled: Boolean(workspaceId && repositoryId && fileId),
  });
}

export function useSymbolQuery(workspaceId: string, repositoryId: string, symbolId: string) {
  return useQuery({
    queryKey: queryKeys.symbol(workspaceId, repositoryId, symbolId),
    queryFn: () => repositoryApi.symbol(workspaceId, repositoryId, symbolId),
    enabled: Boolean(workspaceId && repositoryId && symbolId),
  });
}

export function useDeleteRepositoryMutation(workspaceId: string, repositoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => repositoryApi.remove(workspaceId, repositoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.repositories(workspaceId) });
      queryClient.removeQueries({ queryKey: queryKeys.repository(workspaceId, repositoryId) });
    },
  });
}

function applySession(
  session: AuthSession,
  dispatch: AppDispatch,
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  dispatch(sessionEstablished(session));
  queryClient.setQueryData(queryKeys.me, session.user);
}
