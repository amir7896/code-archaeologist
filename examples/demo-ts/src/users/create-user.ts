import { charge } from '../payments/charge';
import { validateToken } from '../auth/validate-token';

export type User = {
  id: string;
  email: string;
};

export function createUser(email: string, token: string): User {
  if (!email.includes('@')) {
    throw new Error('Invalid email');
  }
  const session = validateToken(token);
  if (!session) {
    throw new Error('Unauthorized');
  }
  charge(token, 1, 'stripe');
  return { id: session.userId, email };
}
