import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, workspaceApi, type AuthSession } from './api';
import { sessionCleared, sessionEstablished } from './store/auth-slice';
import { useAppDispatch } from './store/hooks';
import { type AppDispatch } from './store/store';

export const queryKeys = {
  me: ['me'] as const,
  workspaces: ['workspaces'] as const,
  workspace: (id: string) => ['workspaces', id] as const,
  members: (id: string) => ['workspaces', id, 'members'] as const,
  auditLogs: (id: string) => ['workspaces', id, 'audit'] as const,
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

function applySession(
  session: AuthSession,
  dispatch: AppDispatch,
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  dispatch(sessionEstablished(session));
  queryClient.setQueryData(queryKeys.me, session.user);
}
