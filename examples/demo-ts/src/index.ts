import { createUser } from './users/create-user';
import { charge } from './payments/charge';

export function bootstrap(email: string, token: string): { email: string; charged: number } {
  const user = createUser(email, token);
  charge(token, 10, 'paypal');
  return { email: user.email, charged: 10 };
}
