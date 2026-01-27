# Phase 1: Foundation & Auth - Research

**Researched:** 2026-01-27
**Domain:** Authentication (Clerk + Convex + Next.js)
**Confidence:** HIGH

## Summary

This phase implements user authentication using Clerk as the identity provider, integrated with Convex as the backend database, running on Next.js. The research confirms this is a well-documented, production-proven stack with excellent first-party support between all three technologies.

The integration pattern follows a three-layer security model: Clerk middleware for route protection at the edge, `ConvexProviderWithClerk` for client-side auth context, and `ctx.auth.getUserIdentity()` for backend validation in Convex functions. User decisions specify modal-based auth UI (not dedicated pages), OAuth-first presentation (Google/GitHub), and 30-day session persistence.

**Primary recommendation:** Use Clerk's `<SignInButton mode="modal">` and `<SignUpButton mode="modal">` components for auth UI, configure OAuth providers in Clerk Dashboard, set session lifetime to 30 days in Dashboard settings, and use Convex's `<Authenticated>` component to guard protected content.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @clerk/nextjs | latest | Auth SDK for Next.js | Official Clerk SDK with App Router support, middleware, hooks |
| convex | latest | Backend-as-a-service | Real-time database with first-party Clerk integration |
| convex/react | latest | Convex React bindings | Provides `ConvexProviderWithClerk`, auth components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @clerk/themes | latest | Pre-built Clerk themes | Dark mode, visual customization |
| svix | latest | Webhook verification | Only if using webhooks to sync users |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Clerk modal | Dedicated auth pages | Pages require routing setup; modal is simpler for this use case |
| JWT + webhooks | Client mutations | Webhooks ensure data consistency but add complexity; client mutations are simpler for MVP |

**Installation:**
```bash
npm install @clerk/nextjs convex
npm install @clerk/themes  # optional, for theming
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── layout.tsx           # ClerkProvider + ConvexProvider wrapper
│   ├── page.tsx             # Landing/home (unauthenticated)
│   └── create/
│       └── page.tsx         # Protected creation page
├── components/
│   ├── providers.tsx        # ConvexProviderWithClerk client component
│   ├── auth/
│   │   ├── auth-modal.tsx   # SignIn/SignUp modal triggers
│   │   └── user-menu.tsx    # UserButton with logout
│   └── guards/
│       └── auth-guard.tsx   # Wraps protected content
├── convex/
│   ├── _generated/          # Auto-generated Convex files
│   ├── auth.config.ts       # Clerk JWT configuration
│   ├── schema.ts            # Database schema
│   └── users.ts             # User-related mutations/queries
├── middleware.ts            # Clerk middleware (route protection)
└── .env.local               # Environment variables
```

### Pattern 1: Provider Hierarchy
**What:** Wrap app with ClerkProvider containing ConvexProviderWithClerk
**When to use:** Always - required for auth to work
**Example:**
```typescript
// Source: https://docs.convex.dev/auth/clerk
// src/components/providers.tsx
"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### Pattern 2: Modal Auth Triggers
**What:** Use SignInButton/SignUpButton with mode="modal"
**When to use:** For the user-specified modal-based auth flow
**Example:**
```typescript
// Source: https://clerk.com/docs/nextjs/reference/components/unstyled/sign-in-button
"use client";

import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";

export function AuthButtons() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="btn-primary">Sign In</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="btn-secondary">Sign Up</button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        {/* UserButton for logged-in users */}
      </SignedIn>
    </>
  );
}
```

### Pattern 3: Convex Backend Auth Check
**What:** Validate authentication in every Convex function
**When to use:** Always for protected mutations/queries
**Example:**
```typescript
// Source: https://docs.convex.dev/auth/database-auth
// convex/users.ts
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null; // Or throw if this should never happen
    }
    // Use identity.tokenIdentifier or identity.subject as unique ID
    return identity;
  },
});

export const createUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }
    // Store user in database
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? "",
      email: identity.email ?? "",
    });
    return userId;
  },
});
```

### Pattern 4: Conditional Query with useConvexAuth
**What:** Skip Convex queries until authentication is confirmed
**When to use:** Prevent race conditions where queries run before auth completes
**Example:**
```typescript
// Source: https://stack.convex.dev/authentication-best-practices-convex-clerk-and-nextjs
"use client";

import { useConvexAuth } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function UserProfile() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Skip query until auth is confirmed
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;
  if (!user) return <div>Loading user...</div>;

  return <div>Welcome, {user.name}</div>;
}
```

### Anti-Patterns to Avoid
- **Assuming middleware protects client components:** Server-side auth doesn't automatically secure client-side queries. Always check auth in Convex functions.
- **Using Clerk's useAuth for Convex validation:** Use `useConvexAuth()` from convex/react instead - it confirms the Convex backend has validated the token.
- **Queries without auth checks:** Convex is a public API; every function must explicitly check `ctx.auth.getUserIdentity()`.
- **Relying on middleware alone:** Per CVE-2025-29927, always call `auth()` in routes/pages as a second layer of defense.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth integration | Custom OAuth flow | Clerk Dashboard toggle | OAuth has CSRF, PKCE, state validation complexities |
| Session management | JWT + cookies | Clerk's built-in sessions | Token refresh, invalidation, multi-device is complex |
| Account lockout | Custom attempt tracking | Clerk's Attack Protection | Rate limiting edge cases, distributed systems |
| Sign-in modal UI | Custom modal + forms | `<SignInButton mode="modal">` | Accessibility, error handling, loading states |
| Password validation | Regex rules | Clerk's password protection | Compromised password detection, complexity rules |
| User dropdown menu | Custom dropdown | `<UserButton />` | Sign out, session management, account switching |

**Key insight:** Authentication has countless edge cases (token expiry, concurrent sessions, CSRF attacks, brute force protection). Clerk handles these; rolling your own creates security vulnerabilities.

## Common Pitfalls

### Pitfall 1: Missing Convex auth.config.ts Sync
**What goes wrong:** Auth works in Clerk but `useConvexAuth()` returns `isAuthenticated: false`
**Why it happens:** The Convex backend doesn't know about Clerk's JWT configuration
**How to avoid:** After creating auth.config.ts, run `npx convex dev` or `npx convex deploy` to sync
**Warning signs:** Login succeeds in Clerk, but Convex queries fail or return null user

### Pitfall 2: Environment Variable Prefix Mismatch
**What goes wrong:** Clerk loads on client but server requests fail (or vice versa)
**Why it happens:** `NEXT_PUBLIC_` prefix is required for client-side access; missing it exposes nothing
**How to avoid:** Use exact names: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
**Warning signs:** "Unable to find publishableKey" or silent failures on one side

### Pitfall 3: Race Condition - Queries Before Auth
**What goes wrong:** Convex queries execute before Clerk authentication completes, returning unauthenticated results
**Why it happens:** `useQuery` runs immediately on mount; auth state isn't ready
**How to avoid:** Use `useConvexAuth()` and pass `"skip"` to queries until `isAuthenticated` is true
**Warning signs:** Flashing "unauthorized" state, intermittent null user data

### Pitfall 4: Missing Backend Validation
**What goes wrong:** Authenticated users can access other users' data
**Why it happens:** Trusting client-side auth state without backend verification
**How to avoid:** Every Convex mutation/query MUST call `ctx.auth.getUserIdentity()` and verify
**Warning signs:** No `getUserIdentity()` calls in Convex functions

### Pitfall 5: Middleware Doesn't Protect Client Components
**What goes wrong:** Protected page renders, but queries fail or leak data
**Why it happens:** Middleware only runs on server; client components need separate checks
**How to avoid:** Use Convex's `<Authenticated>` component or check `useConvexAuth()` in all protected components
**Warning signs:** Pages with protected data that work after direct navigation but fail on client-side navigation

### Pitfall 6: Not Upgrading Next.js for CVE-2025-29927
**What goes wrong:** Complete middleware bypass via header manipulation
**Why it happens:** Security vulnerability in Next.js 11.1.4 through 15.2.2
**How to avoid:** Use Next.js 15.2.3+ or 14.2.25+; always call `auth()` in pages as backup
**Warning signs:** Self-hosted deployment on vulnerable Next.js version

## Code Examples

Verified patterns from official sources:

### Middleware Configuration
```typescript
// Source: https://clerk.com/docs/reference/nextjs/clerk-middleware
// middleware.ts (for Next.js <= 15) or proxy.ts (Next.js 16+)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes require authentication
const isProtectedRoute = createRouteMatcher([
  "/create(.*)",
  "/dashboard(.*)",
  "/api/protected(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Convex Auth Configuration
```typescript
// Source: https://docs.convex.dev/auth/clerk
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN, // From Clerk Dashboard JWT template
      applicationID: "convex",
    },
  ],
};
```

### UserButton with Logout
```typescript
// Source: https://clerk.com/docs/nextjs/reference/components/user/user-button
"use client";

import { UserButton } from "@clerk/nextjs";

export function UserMenu() {
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: "w-10 h-10",
        },
      }}
    />
  );
}
```

### Modal Sign-In with OAuth Priority
```typescript
// Source: https://clerk.com/docs/nextjs/reference/components/authentication/sign-in
"use client";

import { SignIn } from "@clerk/nextjs";

// For custom modal rendering (advanced)
export function CustomAuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <SignIn
          routing="hash"
          fallbackRedirectUrl="/create"
          appearance={{
            elements: {
              socialButtonsBlockButton: "mb-2", // OAuth buttons get space
            },
          }}
        />
      </div>
    </div>
  );
}
```

### Guarding Content with Convex Components
```typescript
// Source: https://docs.convex.dev/auth/clerk
"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export function ProtectedContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div>Loading authentication...</div>
      </AuthLoading>
      <Unauthenticated>
        <div>Please sign in to continue</div>
      </Unauthenticated>
      <Authenticated>
        {children}
      </Authenticated>
    </>
  );
}
```

### Error Handling for Sign-In
```typescript
// Source: https://clerk.com/docs/guides/development/custom-flows/error-handling
// For custom flows only - pre-built components handle this automatically
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import type { ClerkAPIError } from "@clerk/types";

async function handleSignIn(email: string, password: string) {
  try {
    // ... sign in logic
  } catch (err) {
    if (isClerkAPIResponseError(err)) {
      const errors: ClerkAPIError[] = err.errors;
      errors.forEach((error) => {
        // error.code - machine readable (e.g., "form_identifier_not_found")
        // error.longMessage - user friendly (e.g., "No account found with that email")
        // error.meta - additional data (e.g., lockout_expires_in_seconds)
        console.log(error.longMessage);
      });
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `authMiddleware()` | `clerkMiddleware()` | 2024 | New middleware API, more flexible |
| `middleware.ts` always | `proxy.ts` for Next.js 16+ | 2025 | File naming convention changed |
| Manual OAuth | Dashboard toggle + automatic | Always | Never hand-roll OAuth |
| Props for redirect URLs | Environment variables | 2024+ | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` preferred |

**Deprecated/outdated:**
- `authMiddleware()`: Replaced by `clerkMiddleware()` - migration required
- `afterSignOutUrl` prop on `UserButton`: Deprecated, use environment variable
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`: Use `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` instead

## Open Questions

Things that couldn't be fully resolved:

1. **Exact lockout thresholds for decision**
   - What we know: Default is 100 attempts, 1 hour lockout; configurable in Dashboard
   - What's unclear: User specified "5 attempts -> 5 minute lockout" but didn't confirm
   - Recommendation: Implement with 5 attempts / 5 minutes as stated; easily changed in Dashboard

2. **User storage strategy**
   - What we know: Two approaches exist - client mutations or webhooks
   - What's unclear: Whether to store users in Convex immediately or on-demand
   - Recommendation: Use client mutation on first protected action (simpler); add webhooks later if needed

3. **OAuth profile data extraction**
   - What we know: Clerk auto-fills name from OAuth providers; available in `identity` object
   - What's unclear: Exact field names for Google vs GitHub profile data
   - Recommendation: Use `identity.name` which Clerk normalizes across providers

## Sources

### Primary (HIGH confidence)
- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) - Installation, ClerkProvider setup
- [Convex & Clerk Integration](https://docs.convex.dev/auth/clerk) - ConvexProviderWithClerk, auth.config.ts
- [Clerk clerkMiddleware](https://clerk.com/docs/reference/nextjs/clerk-middleware) - Middleware configuration
- [SignInButton Reference](https://clerk.com/docs/nextjs/reference/components/unstyled/sign-in-button) - Modal mode
- [UserButton Reference](https://clerk.com/docs/nextjs/reference/components/user/user-button) - Logout functionality
- [Clerk Session Options](https://clerk.com/docs/authentication/configuration/session-options) - 30-day session configuration
- [Clerk User Lockout](https://clerk.com/docs/guides/secure/user-lockout) - Brute force protection

### Secondary (MEDIUM confidence)
- [Convex Stack: Auth Best Practices](https://stack.convex.dev/authentication-best-practices-convex-clerk-and-nextjs) - Provider patterns, race condition prevention
- [Clerk Error Handling](https://clerk.com/docs/guides/development/custom-flows/error-handling) - ClerkAPIError, error codes
- [Convex Database Auth](https://docs.convex.dev/auth/database-auth) - Storing users in Convex

### Tertiary (LOW confidence)
- Community articles on Clerk + Next.js patterns - verified against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official documentation from Clerk and Convex
- Architecture: HIGH - Patterns from official integration guides
- Pitfalls: HIGH - Documented in official troubleshooting + CVE announcements

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable, well-documented stack)
