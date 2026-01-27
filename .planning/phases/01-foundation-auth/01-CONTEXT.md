# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely access their accounts via Clerk: signup, login (email/password and OAuth), session persistence across browsers, and logout. Profile management and session device management are separate concerns.

</domain>

<decisions>
## Implementation Decisions

### Auth Flow UX
- Modal overlay for auth UI (not dedicated pages)
- OAuth buttons (Google/GitHub) shown first, email/password below
- After successful login, redirect to creation page (prompt input)
- Unauthenticated users can browse templates only, must auth to create

### Sign-up Fields
- Email is required (core identifier)
- Display name and username are optional, can be filled later in profile settings
- For OAuth signups, auto-fill name from Google/GitHub profile (user can change later)
- No email verification required before using app - immediate access

### Error Handling
- Specific feedback on login failures ("Email not found" vs "Wrong password")
- Temporary lockout after too many failed attempts (e.g., 5 attempts -> 5 minute lockout)
- Friendly, helpful error tone ("Oops! That email isn't registered yet. Want to sign up?")
- Password reset flow prioritizes speed: email link -> new password -> done

### Session Behavior
- Long-lived sessions (30 days)
- Unlimited concurrent devices allowed
- Logout accessible via user menu dropdown (click avatar/name)

### Claude's Discretion
- Exact modal styling and animations
- Lockout duration and attempt thresholds
- Loading states and transitions
- Clerk component customization details

</decisions>

<specifics>
## Specific Ideas

- OAuth should feel prominent - most users prefer social login
- "Creation page" is where users enter prompts (the core action)
- Keep signup friction minimal - get users to the creation experience fast

</specifics>

<deferred>
## Deferred Ideas

- Session/device management UI (view all devices, revoke sessions) — future feature
- Email verification enforcement — not needed for MVP
- Profile photo upload — noted in requirements as optional

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-01-27*
