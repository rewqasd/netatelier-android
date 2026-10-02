# Teamweb Drawing-to-Network Workflow Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development; leave the existing untracked Android work in the source checkout untouched.

**Goal:** Make the Ubuntu 4318 team web turn a saved restaurant drawing into a reviewable, dimensioned plan and a clearly estimated network draft, without treating unverified model output as correct.

**Architecture:** Preserve original-image identity and tenant/project scoping. Extend the team draft with explicit recognition completeness/provenance and an intuitive original-image review surface for dimensions, walls, and openings. Generate the deterministic network draft only from confirmed scale and geometry; reuse the shared planner while aligning monitoring state, overlays, and summary output.

**Tech Stack:** React, TypeScript, Vite, Node.js, SQLite, existing source-only planner and test harnesses.

**Spec:** User-approved scope in the delegated task; review report v1 at NetAtelier-全面只读审查-2026-10-01.md.

## Global Constraints

- Never modify or delete pre-existing untracked src/team/ or tests/unit/team-server-draft.test.ts in the source checkout.
- No external/paid model invocation or image transfer without separate explicit approval.
- Never hardcode dimensions from the restaurant image as recognition results; missing evidence stays unconfirmed.
- Preserve tenant/project/image/recognition/revision checks and unsaved-work safety.
- Fix teamweb first; offlineapp-only ImportPage defects are out of scope.
- User authorized updating the existing draft PR and family Ubuntu private deployment on 2026-10-02 after tests; keep loopback binding, exposure and existing credential mounts unchanged.
- Keep the main user flow to upload, review evidence/scale/geometry, generate a network draft; fold advanced assumptions away.

## Review Focus

- Missing/conflicting dimensions leave scale unconfirmed and explain why.
- Cropped/resized coordinate frames never silently remap endpoints.
- Room, wall, and door candidates remain distinct and unconfirmed until review.
- Monitoring disabled must not create hidden/unpriced cameras; camera target selection reaches overlay and budget.
- Unsaved edits, image identity, and tenant/project scope remain intact.

### Task 1: Review evidence on the original drawing

**Files:** cloud/ProjectDetails.tsx, cloud/DimensionsPanel.tsx, cloud/project-tools.ts, cloud CSS and focused tests.

- [ ] Write failing tests for intuitive endpoint selection on the saved original and visible candidate value/unit/type/endpoints.
- [ ] Write a failing test that missing or conflicting scale evidence blocks network generation with a clear message.
- [ ] Implement an overlay-based annotation review; never silently remap mismatched source frames.
- [ ] Persist edits with existing revision checks and retain original-drawing identity.
- [ ] Verify red/green using only already-authorized non-user material.

### Task 2: Recognition evidence and geometry review

**Files:** server/vision.mjs, server/vision.test.mjs, src/team/server-draft.ts, cloud/TeamApp.tsx, cloud/ProjectDetails.tsx.

- [ ] Test explicit missing/present states for dimensions, walls, and openings; reject invalid coordinates and mismatched pixel frames.
- [ ] Surface missing evidence distinctly; never fabricate dimensions, walls, openings, or confidence.
- [ ] Review room/wall/opening and dimension candidates over the saved original with source and confirmation state.
- [ ] Preserve recognition history, source-image hash, and revision checks.

### Task 3: Planner and overlay consistency

**Files:** cloud/project-tools.ts, shared planning modules/renderers and focused tests.

- [ ] Test monitoring=false against camera data, display, and pricing; test camera target, wired point count, cabinet/WAN and route results.
- [ ] Define and implement one monitoring policy; show target/heading/coverage estimate in the team plan.
- [ ] Keep functional zones separate from physical walls; only confirmed openings route through walls.
- [ ] Overlay APs, public cameras, data points, cabinet/gateway/switch, and cable paths with coordinate anchors and concise reasons.

### Task 4: Safety and release evidence

**Files:** server/app.mjs, server/vision.mjs, server/app.test.mjs, teamweb tests, docs.

- [ ] Cover decoded-image limits and tenant-scoped image/recognition/adopt/export denial.
- [ ] Reuse an existing trusted image decoder; pause and report if a new dependency or broader server redesign is required.
- [ ] Verify image identity, unsaved-draft recovery, tenant scope, build, and exact branch/diff.
- [ ] Use only the already-authorized synthetic fixture; do not generate another or call a real model.
- [ ] Request fresh review, then push only the intended commit to the authorized draft PR branch after checks pass.

## Excluded until separately authorized

Paid/real model calls, external user image transfer, production deployment or network-exposure changes, and changes to existing untracked Android files.


## Approved repair slice (2026-10-02)

This change implements scale consistency gates and dimension-chain validation, original-image review and pixel-correct point selection/overlay, explicit cabinet and WAN positions, three-step navigation, dirty-work protection, and saved-network restoration. Monitoring, a physical-space versus functional-zone model, automatic CAD extraction, new model calls and Android network integration remain separate work; do not claim them delivered. Existing synthetic fixtures and mock responses are used for tests. Single confirmed scale may display an explicitly unverified area estimate; generation requires independent two-axis evidence and a matching original canvas. Numerical tolerances are engineering safeguards, not surveying accuracy guarantees.

Deployment acceptance: source commit and CI match; SQLite online backup before replacement; unchanged project/image/recognition data; healthy loopback-only endpoint and anonymous object access denied; unrelated service preserved. Restore the previous release using the same volume and existing vision override on failure.
