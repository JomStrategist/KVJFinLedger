import { auth } from '@/auth';
import { LogoutButton } from './LogoutButton';
export async function Header({ user: userProp }: { user?: any } = {}) {
  return (
    <header className="bg-theme-surface border-b border-theme-border h-16 flex items-center justify-between px-6 shrink-0 print:hidden">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-theme-text tracking-tight">KVJ Analytics</h1>
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-theme-surface-hover text-theme-text-muted border border-theme-border">
          FY 2026–27
        </span>
      </div>
    </header>
  );
}
