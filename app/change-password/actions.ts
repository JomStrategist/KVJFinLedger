'use server';

import { prisma } from "@/lib/prisma";
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';

export async function changePassword(
  prevState: any,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword) {
    return { success: false, error: 'Please enter your current password.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'New passwords do not match.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password);
    if (!currentMatches) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        mustResetPassword: false,
      },
    });

    return { success: true, error: '' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update password.' };
  }
}
