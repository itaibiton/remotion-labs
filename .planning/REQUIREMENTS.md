# Requirements: RemotionLab v2.0

**Defined:** 2026-01-29
**Core Value:** Users can go from a text prompt to a rendered, downloadable animated video without any coding or motion design knowledge.

## v2.0 Requirements

Requirements for the Scenes, Timeline & Movie Editor milestone. Each maps to roadmap phases.

### Save & Library

- [x] **SAVE-01**: User can quick-save the current composition as a named clip (code + metadata stored in Convex)
- [x] **SAVE-02**: User can list, open, and delete saved clips from a library page
- [x] **SAVE-03**: Saved clip stores composition code, duration, optional name/thumbnail; can be re-opened in editor and re-rendered

### Timeline & Movie

- [x] **MOVIE-01**: User can create/open a movie with an ordered list of scenes, each referencing a clip
- [x] **MOVIE-02**: Horizontal timeline UI shows scenes in order with duration bars; user can reorder, remove, and add scenes
- [x] **MOVIE-03**: User can preview the full movie (all scenes in sequence) in one Remotion Player via Series composition
- [x] **MOVIE-04**: User can render the full movie to one MP4 via Lambda

### Export

- [x] **OUT-03**: User can export a single clip as MP4 and/or Remotion source without rendering the whole movie
- [x] **OUT-04**: User can export the full movie as one MP4 and/or Remotion project (multi-composition)

### Continuation Generation

- [x] **GEN-06**: User can trigger "Generate next scene" from a clip; system captures the last frame state via code serialization
- [x] **GEN-07**: Claude generates continuation JSX that starts from the previous clip's end state with visual continuity

### UI & Navigation

- [x] **UI-01**: App has a persistent shell with sidebar navigation (Home, Create, Library, Movie, Templates)
- [x] **UI-02**: Create page supports quick-save, "Add to movie," and "Generate next scene" actions
- [x] **UI-03**: Dedicated timeline/movie page for managing scenes and previewing/rendering the full movie
- [x] **UI-04**: Video preview shows a timeline bar with playhead, duration display, and scrub capability

## Future Requirements

Deferred to v2.1+. Tracked but not in current roadmap.

### Transitions

- **TRANS-01**: User can add transitions (fade, slide, wipe) between scenes via TransitionSeries
- **TRANS-02**: User can choose transition type and duration from presets

### Polish

- **POLISH-01**: User can duplicate a scene on the timeline
- **POLISH-02**: Scene-aware prompt context (Claude knows about surrounding scenes when generating)
- **POLISH-03**: Timeline playhead syncs with preview Player position during scrub

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Audio/music tracks on timeline | Visual-only for now; audio adds multi-track complexity |
| Multi-track timeline | Single-track scenes are sufficient; multi-track is editor scope creep |
| Visual drag-and-drop to trim scene duration | Duration is set by code, not timeline handles |
| Real-time collaboration | Solo creation first; Convex reactive queries enable later |
| Sharing/publishing movies | Distribution feature, not creation; export MP4 suffices |
| Storyboard view | Timeline is the primary view; library serves as overview |
| Undo/redo for timeline operations | Simple operations with confirmation; incremental later |
| Payments/subscriptions | Focus on core value first |
| Custom transitions (code-based) | Preset transitions only; code editor for transitions is too complex |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SAVE-01 | Phase 9: App Shell & Clip Library | Complete |
| SAVE-02 | Phase 9: App Shell & Clip Library | Complete |
| SAVE-03 | Phase 9: App Shell & Clip Library | Complete |
| MOVIE-01 | Phase 10: Movie Data & Timeline UI | Complete |
| MOVIE-02 | Phase 10: Movie Data & Timeline UI | Complete |
| MOVIE-03 | Phase 11: Movie Preview, Render & Export | Complete |
| MOVIE-04 | Phase 11: Movie Preview, Render & Export | Complete |
| OUT-03 | Phase 11: Movie Preview, Render & Export | Complete |
| OUT-04 | Phase 11: Movie Preview, Render & Export | Complete |
| GEN-06 | Phase 12: Continuation Generation | Complete |
| GEN-07 | Phase 12: Continuation Generation | Complete |
| UI-01 | Phase 9: App Shell & Clip Library | Complete |
| UI-02 | Phase 12: Continuation Generation | Complete |
| UI-03 | Phase 10: Movie Data & Timeline UI | Complete |
| UI-04 | Phase 11: Movie Preview, Render & Export | Complete |

**Coverage:**
- v2.0 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-02-01 -- Phase 12 requirements marked Complete (GEN-06, GEN-07, UI-02). All v2.0 requirements complete.*
