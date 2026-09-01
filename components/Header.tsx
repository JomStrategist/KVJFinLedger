import { auth } from '@/auth';
import { LogoutButton } from './LogoutButton';
export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="bg-theme-surface border-b border-theme-border h-16 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-theme-text tracking-tight">FinLedger India</h1>
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-theme-surface-hover text-theme-text-muted border border-theme-border">
          FY 2026–27
        </span>
      </div>

      <div className="flex items-center space-x-5">
        <div className="flex flex-col text-right">
          <span className="text-sm font-semibold text-theme-text">{user?.name || 'Guest'}</span>
          <span className="text-[11px] font-medium text-theme-text-muted">{(user as any)?.role || 'USER'}</span>
        </div>
        <div className="h-9 w-9 rounded-full bg-theme-primary flex items-center justify-center text-white font-bold text-sm uppercase shadow-sm">
          {user?.name?.[0] || 'G'}
        </div>
        
        {user && (
          <LogoutButton />
        )}
      </div>
    </header>
  );
}
