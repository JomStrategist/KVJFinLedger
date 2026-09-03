import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "ATG7kBWRrKlZnzMiJ8wYXjFt5O2eQc3p",
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = nextUrl.pathname.startsWith('/api/auth');
      const isLoginRoute = nextUrl.pathname === '/login';
      const isChangePasswordRoute = nextUrl.pathname === '/change-password';
      
      if (isAuthRoute) return true;

      if (!isLoggedIn) {
        if (isLoginRoute) return true;
        return false;
      }

      // User is logged in
      const user = auth?.user as any;
      const mustReset = user?.mustResetPassword;

      if (mustReset) {
        if (!isChangePasswordRoute) {
          return Response.redirect(new URL('/change-password', nextUrl));
        }
        return true;
      }

      // Logged in, no password reset needed
      if (isLoginRoute || isChangePasswordRoute) {
        if (user.role === 'ADMIN') {
          return Response.redirect(new URL('/dashboard', nextUrl));
        } else {
          return Response.redirect(new URL('/home', nextUrl));
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.mustResetPassword = (user as any).mustResetPassword;
      }
      if (trigger === "update" && session !== undefined) {
        if (session.mustResetPassword === false) {
          token.mustResetPassword = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role = token.role as string;
        session.user.id = token.id as string;
        (session.user as any).mustResetPassword = token.mustResetPassword as boolean;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  }
} satisfies NextAuthConfig;
