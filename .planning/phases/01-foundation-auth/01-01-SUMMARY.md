---
phase: 01-foundation-auth
plan: 01
subsystem: auth
tags: [nextjs, clerk, convex, react, typescript, tailwind]

# Dependency graph
requires: []
provides:
  - Next.js 16 app scaffold with App Router
  - Clerk + Convex provider hierarchy
  - Convex users table schema
  - getCurrentUser query and storeUser mutation
affects: [01-02, 02-generation, all-future-phases]

# Tech tracking
tech-stack:
  added: [next@16.1.5, react@19.2.3, @clerk/nextjs@6.36.10, convex@1.31.6, tailwindcss@4]
  patterns: [app-router, server-components, client-providers]

key-files:
  created:
    - src/components/providers.tsx
    - convex/auth.config.ts
    - convex/schema.ts
    - convex/users.ts
    - .env.example
  modified:
    - src/app/layout.tsx
    - package.json

key-decisions:
  - "Geist font retained from Next.js scaffold (modern, readable)"
  - "Convex types deferred to user setup (requires deployment)"

patterns-established:
  - "Provider hierarchy: ClerkProvider > ConvexProviderWithClerk (required order)"
  - "Client components in src/components/ with 'use client' directive"
  - "Convex functions in convex/ directory with schema-based types"

# Metrics
duration: 4min
completed: 2026-01-27
---

# Phase 1 Plan 1: Project Scaffolding Summary

**Next.js 16 scaffold with Clerk auth provider and Convex backend integration, ready for authentication flows**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-27T20:34:17Z
- **Completed:** 2026-01-27T20:38:22Z
- **Tasks:** 3
- **Files modified:** 17 created, 1 modified

## Accomplishments
- Next.js 16 app with App Router, TypeScript, and Tailwind CSS configured
- Clerk + Convex provider hierarchy correctly nested (ClerkProvider wrapping ConvexProviderWithClerk)
- Convex users table schema with tokenIdentifier index for fast user lookups
- User query and mutation functions ready for authentication flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project with dependencies** - `a0bd779` (feat)
2. **Task 2: Configure Clerk + Convex provider hierarchy** - `338e8d5` (feat)
3. **Task 3: Create Convex schema and user functions** - `3ff7647` (feat)

## Files Created/Modified

- `package.json` - Project config with Next.js, Clerk, and Convex dependencies
- `src/app/layout.tsx` - Root layout with Providers wrapper
- `src/components/providers.tsx` - ClerkProvider + ConvexProviderWithClerk client component
- `convex/auth.config.ts` - Clerk JWT issuer configuration for Convex
- `convex/schema.ts` - Users table with tokenIdentifier, email, name, imageUrl, createdAt
- `convex/users.ts` - getCurrentUser query and storeUser mutation
- `.env.local` - Environment variable placeholders (gitignored)
- `.env.example` - Environment variable template for documentation
- `.gitignore` - Standard Next.js + Convex ignores

## Decisions Made

- **Retained Geist font from scaffold:** Modern, readable font appropriate for the application
- **Deferred Convex type generation:** Types require deployment (npx convex dev), which needs user credentials
- **Used Tailwind v4 CSS-based config:** Next.js 16 uses postcss-based Tailwind without tailwind.config.ts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Port 3000 occupied:** Dev server automatically used port 3002 (no action needed, Node.js handled)
- **Convex types not generated:** Expected behavior; _generated folder created on first `npx convex dev` after user configures credentials

## User Setup Required

**External services require manual configuration before the app is fully functional:**

### Clerk Setup
1. Create account at clerk.com and create application
2. Get `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from Clerk Dashboard -> API keys -> Publishable key
3. Get `CLERK_SECRET_KEY` from Clerk Dashboard -> API keys -> Secret keys
4. Get `CLERK_JWT_ISSUER_DOMAIN` from Clerk Dashboard (your instance domain)
5. Enable Google OAuth at Clerk Dashboard -> User & Authentication -> Social connections -> Google
6. Enable GitHub OAuth at Clerk Dashboard -> User & Authentication -> Social connections -> GitHub
7. Set session lifetime to 30 days at Clerk Dashboard -> Sessions -> Session lifetime
8. Create JWT template for Convex at Clerk Dashboard -> JWT Templates -> Create template (name: convex)

### Convex Setup
1. Run `npx convex dev` to create or link a Convex project
2. Get `NEXT_PUBLIC_CONVEX_URL` from Convex Dashboard -> Settings -> Deployment URL

### Environment Variables
Update `.env.local` with actual values:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CLERK_JWT_ISSUER_DOMAIN=https://your-instance.clerk.accounts.dev
```

### Verification
After setup, run:
```bash
npm run dev       # Start Next.js
npx convex dev    # Start Convex (in separate terminal)
```
Both should start without errors. Convex will generate types in `convex/_generated/`.

## Next Phase Readiness

- **Ready:** Project scaffold complete, provider hierarchy configured, schema defined
- **Blocked until:** User completes Clerk and Convex setup (environment variables)
- **Next plan (01-02):** Can proceed with auth UI components once credentials configured

---
*Phase: 01-foundation-auth*
*Plan: 01*
*Completed: 2026-01-27*
