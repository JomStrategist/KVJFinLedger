'use client';

import { useState, useActionState } from 'react';
import { authenticate } from './actions';

export default function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-theme-surface-hover p-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-theme-surface p-8 shadow-xl border border-theme-border">
        {/* Header */}
        <div className="text-center flex flex-col items-center">
          <img
            src="/kvj-logo.png"
            alt="KVJ Analytics"
            className="h-16 w-auto object-contain mb-2"
          />
          <p className="text-xs text-theme-text-muted font-medium tracking-wide">
            Financial Management System
          </p>
        </div>

        {/* Unified Login Form */}
        <form className="space-y-4" action={formAction}>
          <div>
            <label htmlFor="email" className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-theme-border px-3.5 py-2.5 text-sm text-theme-text bg-theme-surface placeholder:text-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-theme-text uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-theme-border pl-3.5 pr-10 py-2.5 text-sm text-theme-text bg-theme-surface placeholder:text-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text transition-colors p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 014.122-.963c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21m-4.22-4.22L3 3" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex justify-center items-center rounded-xl bg-theme-primary px-4 py-3 text-sm font-bold text-white hover:bg-theme-primary-dark focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 disabled:opacity-50 transition-all shadow-sm mt-2"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>

          {errorMessage && (
            <div className="p-3 bg-red-900/10 border border-red-300 rounded-xl text-red-700 text-xs font-semibold text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
