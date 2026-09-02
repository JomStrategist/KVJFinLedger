'use client';

import { useActionState, useEffect } from 'react';
import { changePassword } from './actions';
import { useSession } from 'next-auth/react';

export default function ChangePasswordForm() {
  const { update } = useSession();
  const [state, formAction, isPending] = useActionState(
    changePassword,
    { success: false, error: '' },
  );

  useEffect(() => {
    if (state?.success) {
      update({ mustResetPassword: false }).then((newSession) => {
        if (newSession?.user?.role === 'ADMIN') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/home';
        }
      });
    }
  }, [state, update]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F4F7F5] p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-sm border border-[#D9E3DC]">
        <div>
          <h2 className="text-center text-2xl font-bold text-[#17211B]">
            Change Password
          </h2>
          <p className="mt-2 text-center text-xs text-[#68756C]">
            Please enter your current password and a new secure password.
          </p>
        </div>

        <form className="space-y-4" action={formAction}>
          <div>
            <label htmlFor="currentPassword" className="block text-xs font-semibold text-[#68756C] mb-1.5">
              Current Password *
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-xs font-semibold text-[#68756C] mb-1.5">
              New Password *
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={6}
              className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-semibold text-[#68756C] mb-1.5">
              Confirm New Password *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              placeholder="Re-enter new password"
            />
          </div>

          {state?.error && (
            <div className="p-3 text-xs bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] rounded-xl font-medium text-center">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="p-3 text-xs bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] rounded-xl font-medium text-center">
              Password updated successfully! Redirecting...
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-[42px] bg-[#0F766E] hover:bg-[#0D655D] text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
