# Requirements: RemotionLab

**Defined:** 2025-01-27
**Core Value:** Users can go from a text prompt to a rendered, downloadable animated video without any coding or motion design knowledge.

## v1.0 Requirements (Core Validation) - COMPLETE

All v1.0 requirements delivered. See MILESTONES.md for details.

### Authentication

- [x] **AUTH-01**: User can sign up with Clerk
- [x] **AUTH-02**: User can log in via email/password
- [x] **AUTH-03**: User can log in via OAuth (Google/GitHub)
- [x] **AUTH-04**: User session persists across browser refresh

### Generation

- [x] **GEN-01**: User can enter text prompt describing desired animation
- [x] **GEN-02**: User can browse template/inspiration gallery
- [x] **GEN-03**: User can select template as starting point
- [x] **GEN-04**: System validates generated code before rendering
- [x] **GEN-05**: User sees real-time preview of animation

### Animation Types

- [x] **ANIM-01**: System supports text/typography animations (kinetic typography, animated titles)

### Output

- [x] **OUT-01**: User can download rendered video (MP4)

### Infrastructure

- [x] **INFRA-01**: System enforces usage limits/quotas per user
- [x] **INFRA-02**: User sees render progress in real-time
- [x] **INFRA-03**: System handles errors gracefully with retry options

## v1.1 Requirements (Full Code Generation)

Unlock unlimited animation possibilities by having Claude generate actual Remotion JSX code.

### Code Generation

- [ ] **CODE-01**: Claude generates complete Remotion JSX compositions from text prompts
- [ ] **CODE-02**: System validates generated code via AST parsing before execution
- [ ] **CODE-03**: System executes validated code in safe sandbox environment
- [ ] **CODE-04**: User can view generated Remotion code in editor
- [ ] **CODE-05**: User can edit generated code and re-validate

### Iteration

- [ ] **ITER-01**: User can refine animation via chat ("make it faster", "change color")
- [ ] **ITER-02**: System suggests fixes when code validation fails

### Animation Types (Extended)

- [ ] **ANIM-02**: System supports shape animations (rectangles, circles, paths)
- [ ] **ANIM-03**: System supports motion graphics (complex compositions, sequences)
- [ ] **ANIM-04**: System supports transitions and effects (fade, scale, rotate)

### Output (Extended)

- [ ] **OUT-02**: User can export generated Remotion source code

## v1.2+ Requirements (Future)

Deferred to later milestones based on research recommendations.

### Refinement (v1.1 REQUIREMENTS.md noted as v1.2)

- **REF-01**: User can fine-tune in visual editor (timeline, properties)
- **REF-02**: User can regenerate variations and pick favorite

### Assets

- **AST-01**: User can upload images/logos for use in animations
- **AST-02**: User can browse stock media library (icons, images)

### Animation Types (Extended)

- **ANIM-05**: System supports logo/brand animations
- **ANIM-06**: System supports data visualization animations
- **ANIM-07**: System supports social media content formats

### Output (Extended)

- **OUT-03**: User can get shareable link to video
- **OUT-04**: User can get embed code for external sites

## Out of Scope

Explicitly excluded from v1.x. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Payments/subscriptions | Focus on core value, monetize after validation |
| Custom font uploads | Start with web fonts, add later |
| Audio/music integration | Visual-only for v1, audio adds complexity |
| Brand kits (saved colors/fonts/logos) | Future feature after user feedback |
| Cost estimation display | Simplify MVP UX |
| AI-generated video (Sora-style) | Different technology, not our approach |
| Mobile app | Web-first |
| Real-time collaboration | Solo creation for v1 |
| Arbitrary npm packages | Security risk, use Remotion APIs only |
| Visual click-to-edit | Complex, defer to v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.0 (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| GEN-01 | Phase 2 | Complete |
| GEN-02 | Phase 4 | Complete |
| GEN-03 | Phase 4 | Complete |
| GEN-04 | Phase 2 | Complete |
| GEN-05 | Phase 3 | Complete |
| ANIM-01 | Phase 2 | Complete |
| OUT-01 | Phase 5 | Complete |
| INFRA-01 | Phase 5 | Complete |
| INFRA-02 | Phase 5 | Complete |
| INFRA-03 | Phase 2 | Complete |

### v1.1 (In Progress)

| Requirement | Phase | Status |
|-------------|-------|--------|
| CODE-01 | Phase 6 | Pending |
| CODE-02 | Phase 6 | Pending |
| CODE-03 | Phase 6 | Pending |
| CODE-04 | Phase 6 | Pending |
| CODE-05 | Phase 7 | Pending |
| ITER-01 | Phase 7 | Pending |
| ITER-02 | Phase 7 | Pending |
| ANIM-02 | Phase 6 | Pending |
| ANIM-03 | Phase 6 | Pending |
| ANIM-04 | Phase 6 | Pending |
| OUT-02 | Phase 8 | Pending |

**Coverage:**
- v1.0 requirements: 14 total (complete)
- v1.1 requirements: 11 total (mapped)
- Unmapped: 0

---
*Requirements defined: 2025-01-27*
*Last updated: 2026-01-28 for v1.1 roadmap*
