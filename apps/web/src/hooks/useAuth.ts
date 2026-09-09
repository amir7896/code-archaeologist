import { useLogoutMutation } from '../queries';
import { useAppSelector } from '../store/hooks';

export function useAuth() {
  const user = useAppSelector((state) => state.auth.user);
  const ready = useAppSelector((state) => state.auth.ready);
  const tokens = useAppSelector((state) => state.auth.tokens);
  const logoutMutation = useLogoutMutation();

  return {
    user,
    ready,
    hasSession: Boolean(tokens),
    logout: () => logoutMutation.mutateAsync(),
  };
}
