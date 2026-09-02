'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const rawData = Object.fromEntries(formData);
    const email = (rawData.email as string)?.trim()?.toLowerCase();
    const password = rawData.password as string;

    if (!email || !password) {
      return 'Please enter both email address and password.';
    }

    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid email address or password.';
        default:
          return 'Invalid email address or password.';
      }
    }
    // Re-throw Next.js redirect errors so navigation succeeds
    throw error;
  }
}
