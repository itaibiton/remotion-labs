# Roadmap: v0.5.0 Refinement History Stack

## Overview

Transform refinement workflow into a visual history system where each refinement creates a new version that stacks visually in the right panel. Users can navigate between versions, and the main video player syncs to the selected version. Refinements persist to the database as linked generations.

## Requirements

| ID | Requirement | Phase |
|----|-------------|-------|
| REFINE-01 | Refinement creates new generation linked to parent (persisted) | 29 |
| REFINE-02 | Refinement versions display as thumbnail stack in right panel | 30 |
| REFINE-03 | Each version shows thumbnail preview with version number (V1, V2, V3) | 30 |
| REFINE-04 | Clicking version in stack updates main video player | 30 |
| REFINE-05 | Stack is scrollable for unlimited refinement history | 30 |
| REFINE-06 | Save action saves currently selected version only | 30 |

## Phases

### Phase 29: Schema & Refinement Persistence

**Goal**: Refinements create new database records linked to parent generation

**Depends on**: Phase 26 (modal with inline refinement)

**Requirements**: REFINE-01

**Success Criteria** (what must be TRUE):
  1. Submitting a refinement creates a new generation document with `parentGenerationId` pointing to the current generation
  2. New generation document includes `refinementPrompt` field storing the instruction used
  3. `listByParent` query fetches all children of a generation (for variation display)
  4. `getRefinementChain` query returns ordered version history (original -> V1 -> V2 -> ...)
  5. Generations schema has `parentGenerationId` field with `by_parent` index

**Plans:** 2 plans

Plans:
- [ ] 29-01-PLAN.md - Schema & query infrastructure (parentGenerationId, refinementPrompt, by_parent index, mutations, queries)
- [ ] 29-02-PLAN.md - Refinement action & UI integration (refineAndPersist action, UI wiring)

---

### Phase 30: Refinement Stack UI

**Goal**: Visual version stack in right panel with thumbnail previews and navigation

**Depends on**: Phase 29 (schema and queries must exist)

**Requirements**: REFINE-02, REFINE-03, REFINE-04, REFINE-05, REFINE-06

**Success Criteria** (what must be TRUE):
  1. Right panel displays a vertical stack of refinement version cards (replaces existing detail panel section)
  2. Each card shows a thumbnail preview with version number badge (V1, V2, V3...)
  3. Clicking a card selects that version and updates the main center video player
  4. Currently selected version has visual highlight (border, background, or glow)
  5. Stack is scrollable when versions exceed available height
  6. Save button saves the currently selected version (not always latest)
  7. Version numbers are derived from chain position (original=V1, first refinement=V2, etc.)

**Plans**: TBD

---

## Progress

**Execution Order:**
Phases execute in numeric order: 29 -> 30

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 29. Schema & Refinement Persistence | v0.5.0 | 0/2 | Planned | - |
| 30. Refinement Stack UI | v0.5.0 | TBD | Not Started | - |

---
*Roadmap created: 2026-02-05*
*v0.5.0 requirements: 6 mapped across 2 phases (29-30)*
