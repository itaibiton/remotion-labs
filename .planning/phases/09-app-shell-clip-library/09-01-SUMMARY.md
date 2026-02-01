---
phase: 09-app-shell-clip-library
plan: 01
subsystem: ui
tags: [next.js, route-groups, sidebar, navigation, layout, lucide-react]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: root layout with Providers, Clerk auth, UserMenu component
  - phase: 04-templates
    provides: templates page and TemplateGallery component
  - phase: 05-preview
    provides: create page with generation, preview, editing, export
provides:
  - App shell layout with persistent sidebar and shared header
  - (app) route group wrapping authenticated pages
  - Sidebar component with 5 nav items and active state highlighting
  - AppHeader component with logo and UserMenu
  - clipId search param support on create page (for Plan 09-03)
affects:
  - 09-02 (clip library page lives inside (app) route group)
  - 09-03 (clip-to-editor uses clipId param added here)
  - 10-scenes-timeline (movie page link already in sidebar)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "(app) route group for authenticated pages with shared shell layout"
    - "Sidebar navigation with usePathname active state detection"
    - "Shell components in src/components/shell/"

key-files:
  created:
    - src/app/(app)/layout.tsx
    - src/components/shell/sidebar.tsx
    - src/components/shell/app-header.tsx
    - src/app/(app)/create/page.tsx
    - src/app/(app)/create/create-page-client.tsx
    - src/app/(app)/templates/page.tsx
  modified: []

key-decisions:
  - "(app) route group pattern to scope shell layout to authenticated pages while keeping landing page standalone"
  - "5 nav items including Movie placeholder for Phase 10 readiness"

patterns-established:
  - "Route group (app) for all authenticated pages sharing sidebar + header"
  - "Shell components (Sidebar, AppHeader) in src/components/shell/"
  - "Per-page headers removed in favor of shared AppHeader"

# Metrics
duration: 2min
completed: 2026-02-01
---

# Phase 9 Plan 1: App Shell Summary

**Persistent sidebar navigation with (app) route group, 5 nav items with active state, and shared AppHeader replacing per-page headers**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-01T09:07:04Z
- **Completed:** 2026-02-01T09:09:35Z
- **Tasks:** 2
- **Files modified:** 8 (2 created shell components, 4 created route group files, 2 deleted old pages)

## Accomplishments
- Created Sidebar with 5 navigation links (Home, Create, Library, Movie, Templates) and active state highlighting via usePathname
- Created AppHeader with logo link and UserMenu, replacing per-page headers
- Created (app) route group layout nesting sidebar + header around all authenticated pages
- Migrated create and templates pages into route group, removing duplicate headers
- Added clipId search param to create page for Plan 09-03 readiness
- Landing page remains standalone with its own header -- no sidebar

## Task Commits

Each task was committed atomically:

1. **Task 1: Create app shell components (Sidebar + AppHeader)** - `5020c8f` (feat)
2. **Task 2: Create (app) route group layout and migrate pages** - `f44ac49` (feat)

## Files Created/Modified
- `src/components/shell/sidebar.tsx` - Client sidebar with 5 nav items, active state via usePathname, lucide icons
- `src/components/shell/app-header.tsx` - Client header with logo Link and UserMenu
- `src/app/(app)/layout.tsx` - Server layout wrapping AppHeader + Sidebar + main content area
- `src/app/(app)/create/page.tsx` - Create page server component with template + clipId params
- `src/app/(app)/create/create-page-client.tsx` - Create page client component (header removed, clipId prop added)
- `src/app/(app)/templates/page.tsx` - Templates page (header removed, "use client" removed)
- `src/app/create/page.tsx` - DELETED (moved to route group)
- `src/app/create/create-page-client.tsx` - DELETED (moved to route group)
- `src/app/templates/page.tsx` - DELETED (moved to route group)

## Decisions Made
- Used Next.js (app) route group pattern to scope shell layout to authenticated pages while keeping landing page standalone outside the group
- Included Movie nav item in sidebar now (href="/movie") as placeholder for Phase 10, avoiding future sidebar modification
- Removed "use client" from templates page since TemplateGallery handles its own client-side behavior

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness
- (app) route group is ready for Plan 09-02 to add Library page at /library
- clipId search param wired in create page server component for Plan 09-03
- Movie nav link in sidebar ready for Phase 10

---
*Phase: 09-app-shell-clip-library*
*Completed: 2026-02-01*
