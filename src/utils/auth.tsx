import { useStore } from '@/state/store';

/** Thin auth facade over the store, kept at the original path (utils/auth.tsx). */
export function useAuth() {
  const { me, ready, actions } = useStore();
  return {
    user: me,
    ready,
    isAdmin: me?.role === 'admin',
    login: actions.login,
    register: actions.register,
    logout: actions.logout,
    changePassword: actions.changePassword,
    refreshUser: async () => {},
  };
}
