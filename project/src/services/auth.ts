import { signIn } from '../lib/auth';

export async function login(email: string, password: string) {
  const { user } = await signIn(email, password);
  return user;
}
