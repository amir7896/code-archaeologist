import { validateToken, type Session } from '../auth/validate-token';

export type Charge = {
  session: Session;
  amount: number;
  provider: 'stripe' | 'paypal';
};

export function charge(token: string, amount: number, provider: 'stripe' | 'paypal' = 'stripe'): Charge {
  const session = validateToken(token);
  if (!session) {
    throw new Error('Unauthorized');
  }
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  return { session, amount, provider };
}
