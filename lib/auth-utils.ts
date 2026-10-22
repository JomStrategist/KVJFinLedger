import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getEffectiveUserPermissions, RolePermissions } from '@/lib/rbac';

export async function requireAuth() {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  if (!session?.user) {
    redirect('/login');
  }
  if ((session.user as any)?.mustResetPassword) {
    redirect('/change-password');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if ((session.user as any).role !== 'ADMIN') {
    redirect('/dashboard');
  }
  return session;
}

/**
 * Ensures caller is authenticated for Server Actions.
 * Throws explicit error suitable for try/catch in Server Actions.
 */
export async function requireActionAuth() {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }
  if (!session?.user) {
    throw new Error("Unauthorized: Please sign in to perform this action.");
  }
  return session;
}

/**
 * Ensures caller has ADMIN role for Server Actions.
 * Throws explicit error suitable for try/catch in Server Actions.
 */
export async function requireActionAdmin() {
  const session = await requireActionAuth();
  if ((session.user as any).role !== 'ADMIN') {
    throw new Error("Forbidden: Administrator privileges are required.");
  }
  return session;
}

/**
 * Checks role-based module permissions for Server Actions.
 */
export async function requireActionPermission(
  module: keyof RolePermissions,
  action: 'view' | 'create' | 'edit' | 'delete' | 'export' = 'view'
) {
  const session = await requireActionAuth();
  const user = session.user as any;
  if (user.role === 'ADMIN') {
    return session;
  }
  const permissions = getEffectiveUserPermissions(user);
  const modPerm = permissions[module];
  if (!modPerm || modPerm.level === 'No Access' || !modPerm[action]) {
    throw new Error(`Forbidden: Insufficient permissions to ${action} ${String(module)}.`);
  }
  return session;
}

