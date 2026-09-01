'use client';

import { useState, useActionState } from 'react';
import { authenticate } from './actions';

export default function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );
  const [roleType, setRoleType] = useState<'ADMIN' | 'USER'>('USER');

  return (
    <div className="flex h-screen w-full items-center justify-center bg-theme-surface-hover">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-theme-surface p-8 shadow-lg border border-theme-border">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-theme-primary flex items-center justify-center font-bold text-white shadow-sm text-xl mb-3">
            KVJ
          </div>
          <h2 className="text-2xl font-bold text-theme-text tracking-tight">
            KVJ Analytics
          </h2>
          <p className="mt-1 text-xs text-theme-text-muted">
            Financial Management System
          </p>
        </div>

        <div className="flex bg-theme-surface-hover p-1 rounded-lg">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              roleType === 'ADMIN' ? 'bg-theme-surface shadow text-theme-text' : 'text-theme-text-muted hover:text-theme-text'
            }`}
            onClick={() => setRoleType('ADMIN')}
          >
            Admin
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              roleType === 'USER' ? 'bg-theme-surface shadow text-theme-text' : 'text-theme-text-muted hover:text-theme-text'
            }`}
            onClick={() => setRoleType('USER')}
          >
            User
          </button>
        </div>

        <form className="mt-8 space-y-6" action={formAction}>
          <input type="hidden" name="roleType" value={roleType} />
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-lg border border-theme-border px-3 py-3 text-theme-text placeholder-gray-500 focus:z-10 focus:border-theme-primary focus:outline-none focus:ring-theme-primary sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full appearance-none rounded-lg border border-theme-border px-3 py-3 text-theme-text placeholder-gray-500 focus:z-10 focus:border-theme-primary focus:outline-none focus:ring-theme-primary sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-theme-primary px-4 py-3 text-sm font-medium text-white hover:bg-theme-primary-dark focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 disabled:bg-blue-400"
            >
              {isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          {errorMessage && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-900/20 py-2 rounded-lg border border-red-100">
              {errorMessage}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
