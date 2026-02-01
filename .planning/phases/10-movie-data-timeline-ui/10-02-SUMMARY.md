---
phase: 10-movie-data-timeline-ui
plan: 02
subsystem: ui-pages
tags: [nextjs, react, convex, movies, routing, dialog]
dependency_graph:
  requires: [10-01]
  provides: [movie-list-page, movie-editor-page, create-movie-dialog]
  affects: [10-03, 11-01]
tech_stack:
  added: []
  patterns: [movie-grid-cards, create-dialog-pattern, editor-shell-with-placeholder]
key_files:
  created:
    - src/app/(app)/movie/page.tsx
    - src/app/(app)/movie/[id]/page.tsx
    - src/components/movie/movie-list.tsx
    - src/components/movie/create-movie-dialog.tsx
    - src/components/movie/movie-editor.tsx
  modified: []
decisions:
  - id: movie-card-icon-placeholder
    decision: "Movie cards use Film icon in bg-primary/10 area instead of thumbnail"
    rationale: "Movies have no single thumbnail yet; consistent visual placeholder"
  - id: create-dialog-navigate-on-success
    decision: "Creating a movie immediately navigates to its editor page"
    rationale: "Users want to start building immediately after creation"
metrics:
  duration: ~1.8 min
  completed: 2026-02-01
---

# Phase 10 Plan 02: Movie List Page & Editor Shell Summary

Movie list page at /movie with grid cards, create dialog, and editor shell at /movie/[id] with reactive Convex data loading, all following established ClipLibrary/SaveClipDialog patterns.

## What Was Done

### Task 1: Movie list page with grid, create dialog, and navigation

Created three files implementing the movie list experience:

**`src/app/(app)/movie/page.tsx`** -- Route page following the exact layout pattern from library/page.tsx: flex column with 6xl max-width container, "Movies" heading, and MovieList component.

**`src/components/movie/movie-list.tsx`** -- "use client" component with three states:
- **Loading:** 3 skeleton cards with aspect-video placeholder and text shimmers
- **Empty:** Centered Film icon, "No movies yet" heading, description, and Create Movie button
- **Populated:** Responsive grid (1/2/3 columns) of Card components. Each card shows a Film icon area, movie name (truncated), scene count, and duration. Cards navigate to `/movie/[id]` on click.

Above the grid, a "Create Movie" button opens the CreateMovieDialog. After creation, navigates to the new movie's editor page.

**`src/components/movie/create-movie-dialog.tsx`** -- "use client" dialog following SaveClipDialog pattern. Name input with "My Movie" default, Enter key support, Cancel/Create buttons. Uses `useMutation(api.movies.create)`, shows toast on success/error, calls `onCreated(movieId)` callback for navigation.

**Commit:** `89fdb4a`

### Task 2: Movie editor page and editor shell component

Created two files implementing the movie editor:

**`src/app/(app)/movie/[id]/page.tsx`** -- Dynamic route with async params (Next.js App Router pattern), passes movie ID to MovieEditor component.

**`src/components/movie/movie-editor.tsx`** -- "use client" component with three states:
- **Loading:** Header skeleton with spinner in content area
- **Not found:** Film icon, "Movie not found" message, link back to /movie
- **Loaded:** Header with movie name, scene count ("N scenes"), and duration ("X.Xs" or "Empty"). Timeline area shows empty state prompt when no scenes, or placeholder text showing scene count for populated movies. Placeholder areas left for Plan 03 timeline component and Phase 11 preview/render buttons.

Uses `useQuery(api.movies.getWithClips)` with the `movieId as any` cast pattern matching clips.get usage.

**Commit:** `890c6ca`

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Film icon placeholder for movie cards | No single thumbnail for multi-scene movies | Visual consistency, can upgrade later |
| Navigate to editor on create | Users want to start building immediately | Good UX flow from list to editor |
| Editor shell with placeholder areas | Plan 03 fills timeline, Phase 11 fills buttons | Clean separation of concerns |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `npm run build` passes with zero TypeScript errors
- Both `/movie` (static) and `/movie/[id]` (dynamic) routes registered in build output
- All four key_links verified: `useQuery(api.movies.list)`, `useMutation(api.movies.create)`, `useQuery(api.movies.getWithClips)`, `router.push(/movie/...)`
- All artifacts exceed minimum line counts (17/10/108/108/89 vs 8/8/50/40/40)
- Sidebar "Movie" link already wired from Phase 09-01, uses `pathname.startsWith("/movie")` for active state

## Next Phase Readiness

Plan 10-03 (Timeline UI) can proceed. The editor shell is ready:
- `/movie/[id]` route loads movie with populated clips via `getWithClips`
- Timeline placeholder area in `movie-editor.tsx` is ready for the timeline component
- Empty state prompt area is ready for the "Add Scene" button
- Header placeholder is ready for preview/render buttons (Phase 11)
