import type { User } from '@/state/types';

/** Where a signed-in user must land, used by the root route guard. */
export function homeRouteFor(user: User): string {
  if (user.mustChangePassword) return '/changer-mot-de-passe';
  if (user.role === 'admin') return '/(admin)/dashboard';
  if (!user.onboarded) return '/onboarding';
  return '/';
}
