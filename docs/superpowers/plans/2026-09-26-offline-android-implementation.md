# Offline Android Network Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development if the user selects that method. Implement task-by-task; steps use checkboxes. This plan is not evidence of implementation or acceptance.

**Goal:** Build a genuinely offline, installable Android network-planning app with real drawing recognition, editable plans, quantities/pricing, topology, five scenes and exports; publish verified source and APK to the user's new public GitHub repository.

**Architecture:** A bundled React/TypeScript interface and SVG editor run in Capacitor Android without a remote server. Kotlin plugins provide local document access, PDF rasterization, bundled ML Kit OCR, private project storage and exports. Pure typed engines derive placements, routes, quantities, quote and topology from one applied project.

**Tech Stack:** React, TypeScript, Vite, Capacitor Android, Kotlin, bundled ML Kit Chinese/Latin OCR, local image-processing worker, Vitest, Playwright, Android instrumentation, Gradle and Android emulator. Lock exact compatible versions during Task 1; do not use floating dependencies in the delivered project.

**Spec:** `docs/superpowers/specs/2026-09-26-offline-android-design.md`

## Global Constraints

- Independent `netatelier-android` repository; do not modify or import the old 集优 project or any Linux artifacts.
- Product name 组网工坊 / NetAtelier; package `io.github.rewqasd.netatelier`; minimum Android 8.0 / API 26.
- Target public repository `rewqasd/netatelier-android`. Recheck name availability and authenticated account before creation. No unrelated repository mutations, force pushes, server deployment or firewall changes.
- Core first-use workflow must work offline, including OCR. No CDN, remote app URL, runtime model download, cloud recognition, account requirement or analytics integration.
- Five distinct scenes: restaurant400㎡, office300㎡, gym1000㎡, hotel40rooms/4floors/400㎡ per floor, retail200㎡.
- Preserve truthful physical coordinates, locked edits and independent electrical links. Display offsets never enter engineering quantities.
- Required equipment/material/labor only by default; optional business hardware/UPS/services require affirmative joining.
- Quote is RMB integer cents, dated source snapshots, explicit unknowns; incomplete design cannot be presented as verified construction quote.
- User documents, project data, secrets, signing keys and local machine paths never enter the public repository or its history. No source license is assigned on the user's behalf without their choice; retain third-party notices.
- No feature is complete merely because a browser mock, compiler, fixture or test count is green. Preserve requirement-level acceptance evidence.
- Follow RED → observed failure → minimal implementation → GREEN → review → local commit for each behavioral task. Commit only owned source/tests/docs, not runtime or customer data.

## Review Focus

1. Cold offline install without Play Services model cache: native OCR must actually recognize Chinese text; Task 3 owns the native test, Task 11 repeats it on a fresh install.
2. Rotated drawings and equivalent symmetric candidates: privacy and target coverage must be invariant without assuming identical array order; Tasks 2/5 own metamorphic tests.
3. Process death during a save or PDF render: last valid project must survive; Tasks 3/8 own cancellation/atomic-write tests, Task 11 exercises Android recreation.
4. Malicious or oversized documents/project archives and CSV formula cells: reject before unsafe allocation/path use and escape export cells; Tasks 3/8/10 own tests.
5. Capacity/price changes and dormant monitoring: protected geometry stays intact while all three views and optional increments stay consistent; Tasks 5/7/9 own engine/UI regression tests.

## File Boundaries and Shared Contracts

All geometry after calibration uses metres; raw imported OCR/wall candidates use explicitly labelled pixels. Never mix display coordinates with engineering coordinates.

- `src/domain/model.ts`: versioned Project, Floor, Room, Opening, Target, Device, Cable, Settings, BusinessSelection, PriceOverride and Issue types.
- `src/domain/schema.ts`: runtime validation/migrations; finite bounds and reference validation.
- `src/domain/geometry.ts`: polygon inclusion/intersection, metric transforms, visibility and distance.
- `src/scenes/`: five independent data builders plus user-facing scene metadata/default assumptions.
- `src/recognition/`: native bridge contract, worker image pipeline, pixel recognition drafts, calibration and draft-to-floor conversion.
- `src/planning/`: candidate generation, AP/camera selection, routing/shared-segment geometry, immutable edits and history.
- `src/catalog/`: exact equipment IDs, verified specs, price snapshots, sources and optional recommendation metadata.
- `src/quote/`: endpoint allocation, electrical capacity, quantities, storage, money and quote derivation.
- `src/topology/`: logical graph from the same design/allocation, no independent inventory.
- `src/project/`: storage bridge, transactions, migrations and safe archive import/export.
- `src/ui/`: home, import/calibration, floorplan, settings, inspector, quote, recommendations and topology components.
- `src/export/`: pure SVG/CSV/report rendering; Android bridge only handles actual file destinations and PDF rendering.
- `android/app/src/main/java/io/github/rewqasd/netatelier/`: native entry point and local document, OCR, project-store and export plugins.
- `tests/unit/`, `tests/web/`, `android/app/src/androidTest/`: distinct evidence scopes; fixtures under `tests/fixtures/` with provenance.
- `scripts/`: environment diagnosis, local verification, emulator test, public-content scan and release hashing; no implicit upload in a test script.

Shared public signatures (each implemented by the owning task):

```ts
type Vec2 = { x: number; y: number }
type SceneId = 'restaurant' | 'office' | 'gym' | 'hotel' | 'retail'
type Issue = { code: string; severity: 'warning' | 'blocking'; message: string; entityIds: string[] }
// Remaining named types below are defined in src/domain/model.ts by Task 1.
validateProject(value: unknown): { project?: Project; issues: Issue[] }
createScene(id: SceneId): Project
recognizeDocument(input: DocumentPage, signal?: AbortSignal): Promise<RecognitionDraft>
calibrateDraft(draft: RecognitionDraft, calibration: Calibration, edits: DraftEdits): Floor
planFloor(floor: Floor, settings: Settings): { floor: Floor; issues: Issue[] }
routeFloor(floor: Floor): { floor: Floor; issues: Issue[] }
bundleCables(cables: Cable[]): SharedSegment[]
deriveProject(project: Project, catalog: Catalog): DerivedProject
applyEdit(project: Project, edit: ProjectEdit): Project
buildTopology(project: Project, derived: DerivedProject): TopologyGraph
renderExport(project: Project, derived: DerivedProject, format: ExportFormat): ExportArtifact
```

`DerivedProject` contains quantities, allocations, BOM, section totals, all issues and completeness; it is not persisted as a second editable project. `RecognitionDraft` retains original document dimensions, pixel candidates and per-object provenance. `ProjectEdit` is a discriminated union; one applied edit is one undo entry. `ExportArtifact` has filename, MIME and bytes/text or report HTML for the native renderer.

## Task 1 — Reproducible local app shell and validated project contract

**Files:** create `package.json`, lockfile, Vite/TypeScript/Vitest config, `src/domain/{model,schema}.ts`, `src/main.tsx`, `src/ui/App.tsx`, `capacitor.config.ts`, generated `android/` scaffold, `.gitignore`, `scripts/android-env.sh`, `tests/unit/schema.test.ts`, `tests/helpers/projects.ts`, `docs/environment.md`.

**Interfaces:** produces all model types above. Project has schemaVersion1, global settings, floors, selected optional devices and price overrides. Floor owns rooms/openings/targets/devices/cables/calibration/document reference. AP/camera/info/WAN/cabinet kinds are explicit; devices have stable IDs, floorId, positionM, locked, source and optional monitoring target IDs. No secrets or paths in domain objects.

- [ ] Write failing schema tests: reject NaN/Infinity, duplicate IDs, absent floor references, negative quantities, unknown schema versions and incompatible wire/radio fields; validate a minimal finite scene. Example assertion: `expect(validateProject({schemaVersion:999}).project).toBeUndefined()`.
- [ ] Install only task-required dependencies/toolchain, then run `npm run test:unit -- tests/unit/schema.test.ts` and record the expected missing/invalid validator failure. Capture versions in `docs/environment.md`; SDK/JDK paths stay local and ignored.
- [ ] Implement schema and minimal local asset shell, add Android platform, set package/minSdk26 and safe insets; expose scripts `dev`, `build`, `typecheck`, `test:unit`, `test:web`, `android:sync`, `android:build`. Do not set `server.url` to a dev server. Add a neutral initial screen, not a fake finished planner.
- [ ] Run schema tests/typecheck/build and `npm run android:build`; inspect merged manifest/package/minSdk and APK signature, install/launch on emulator. This is shell evidence only. Document exact compatible pinned versions and how Android SDK licenses are handled; do not silently accept unrelated terms.
- [ ] Commit the scaffold, validation tests and environment notes after checking ignored local dependencies/build data are excluded.

## Task 2 — Five metric scenes and geometry primitives

**Files:** `src/domain/geometry.ts`, `src/scenes/{index,restaurant,office,gym,hotel,retail}.ts`, `tests/unit/{geometry,scenes}.test.ts`, extend `tests/helpers/projects.ts` with `rectangleFloor`, `rotateProject`, `translateProject`.

**Interfaces:** `createScene(SceneId): Project`; helpers `containsPoint`, `segmentsIntersect`, `segmentBlocked`, `polygonArea`, `transformFloor`. Scenes contain actual rooms, legal openings, privacy semantics and initial targets; devices are generated by later tasks, not pre-positioned screenshots.

- [ ] Write failures asserting five unique layouts, exact stated areas, no positive-area room overlaps, hotel4×10 rooms, valid corridors/targets and all room vertices within boundary. Add transform tests: a20m×15m rectangle remains300㎡ under90° rotation and translation.
- [ ] Run `npm run test:unit -- tests/unit/geometry.test.ts tests/unit/scenes.test.ts`; record failing missing geometry/scene behavior.
- [ ] Implement robust epsilon-based geometry and distinct scene builders. Document occupancy/terminal defaults and their non-duplicating derivation. Privacy tags are structural data, not keyword filtering during rendering.
- [ ] Rerun tests; render fixture-only previews at phone/tablet dimensions and inspect boundaries/room labels. These previews do not count as completed planning output.
- [ ] Commit scene/geometry deliverable with assumptions.

## Task 3 — Native local import, PDF and bundled OCR

**Files:** `src/recognition/{native,types}.ts`, `src/ui/ImportPage.tsx`, native `LocalDocumentsPlugin.kt`, `OcrPlugin.kt`, `DocumentLimits.kt`, Android Gradle model dependencies, instrumentation `OfflineOcrTest.kt`, `DocumentLimitsTest.kt`, `tests/fixtures/recognition/README.md` and independent sample images/PDF.

**Interfaces:** `pickDocument(): Promise<DocumentHandle>` returns private copied file reference/MIME/page count; `renderPage(handle,page): Promise<DocumentPage>` returns bounded raster and rotation transform; `recognizeText(page): Promise<OcrText[]>` returns text/pixel boxes/source, never rooms. Native asynchronous requests carry request IDs; cancellation releases PDF/bitmap resources and ignores stale callbacks.

- [ ] Add native failing tests for a bundled Chinese/Latin image (`recognizedText` must contain expected Chinese room word and numeric label), PDF page selection/rotation, corrupt document rejection and cancellation not committing a partial result. Limits: input≤50MiB, image≤24MP, PDF≤60pages, per-page recognition raster longest edge≤2400px, one active recognition request.
- [ ] Run `./gradlew connectedDebugAndroidTest` from `android/` with the targeted classes; establish failure due to absent plugin/recognizer, not merely missing emulator. Record emulator API and image type.
- [ ] Implement SAF picker, validation, private copy, PdfRenderer and bundled Chinese/Latin ML Kit models. No downloaded model variant or backend fallback. Return structured errors; release recognizers and resources. Add cancellation/progress UI using actual processing stages.
- [ ] Install freshly, disable emulator networking before first OCR, run the real native test and import UI. Verify no Play Services model cache dependency. Save bounded redacted test evidence; reject overlimit input before allocating its bitmap.
- [ ] Commit plugin, tests, safe public fixtures and model dependency notices; exclude user documents and private runtime logs.

## Task 4 — Pixel geometry recognition, calibration and editable correction

**Files:** `src/recognition/{image-pipeline,recognition.worker,calibration,draft}.ts`, `src/ui/{RecognitionPage,CalibrationPanel,RoomEditor}.tsx`, `tests/unit/{recognition,calibration}.test.ts`, `tests/web/recognition.spec.ts`.

**Interfaces:** implements `recognizeDocument`, `calibrateDraft`; `DocumentPage` pixel buffer and OCR blocks produce draft wall segments, room polygons, possible openings and names with candidate/confirmed provenance. Confirmed `Floor` coordinates are metres and preserve original image transform/reference.

- [ ] Write failures using three independent drawing structures, including angled/rotated/noisy input: pixel-to-metre conversion (200px known10m ⇒100px=5m), separate text versus wall output, manual room/door/privacy correction, and missing calibration blocks measured-cost completeness. Assert two visibly different drawings cannot produce the same canned template geometry.
- [ ] Run unit and web recognition tests and record missing behavior. Browser OCR fixtures test only draft editing; native OCR remains Task3/11 evidence.
- [ ] Implement worker thresholding/morphology/line and enclosed-region candidates with text-mask handling; combine room labels spatially. Uncertain openings/walls require confirmation. Implement polygon editing, room uses, entrance/cabinet/target markers and two-point calibration, plus explicitly labelled approximate area scaling. Rerun recognition into a new draft, never overwrite a confirmed project.
- [ ] Run tests and inspect original-versus-overlay images for all three samples. Measure failure honestly: a poor image may require correction, but clear non-template samples must exhibit actual recovered geometry. Verify cancellation, no-result and stale request handling.
- [ ] Commit recognition/correction module and provenance/limitations notes.

## Task 5 — Explainable AP/camera placement and immutable edits

**Files:** `src/planning/{candidates,ap,cameras,edits,history}.ts`, `tests/unit/{placement,edits,history}.test.ts`.

**Interfaces:** implements `planFloor` and `applyEdit`. Placement operates on confirmed metric geometry and target semantics. `ProjectEdit` covers device counts/radio/model, move/lock/delete, floor/settings updates, business join/remove and route edits. Camera retains monitoringTargetIds and view direction even though its normal icon is a dome.

- [ ] Write failing tests: camera targets at upper entrance/central cashier/lower corridor must be covered or explicitly listed missing; no camera inside private polygons or default meeting/office/guest rooms; blocked sightline cannot count as coverage; AP service demand retained under model change; reducing below protected count fails without mutation. Add rotate/translate tests asserting legal installations and equivalent target coverage, not identical array index ordering.
- [ ] Run `npm run test:unit -- tests/unit/placement.test.ts tests/unit/edits.test.ts tests/unit/history.test.ts`; capture RED.
- [ ] Generate physical candidate locations per valid room/wall; AP selection balances weighted service coverage/capacity and spacing, camera selection greedily covers explicit visible targets under legitimate installation limits. Tie breaking must not depend on screen-bottom sorting. Report uncovered targets and unknown wall assumptions. Implement single-transaction edits, locked protection and undo/redo; draft state remains outside Project.
- [ ] Rerun tests; inspect all five generated layouts and transformed inputs. A hand-picked pretty template is insufficient. Assert changing only radio leaves device positions exactly unchanged and source Project remains unchanged.
- [ ] Commit algorithms and their limits; do not advertise RF simulation or guaranteed camera field performance.

## Task 6 — Physical routing, shared display segments and measured quantities

**Files:** `src/planning/{routing,shared-routes}.ts`, `src/quote/quantities.ts`, `tests/unit/{routing,shared-routes,quantities}.test.ts`.

**Interfaces:** `routeFloor` fills independent Cable point chains with status; `bundleCables` returns unique display segments carrying cable IDs/kinds; `measureProject(project): Quantities` returns net cable, allowances/reserve, unique tray, floor backbone and issues. Invalid routes are not coerced to zero-length valid links.

- [ ] Write manual-oracle failures: two independent10m lines sharing all geometry ⇒20m net cable and10m tray; reverse and partial overlap share only their actual common length; translated/rotated routes preserve metres; crossing at a point shares no length. Add endpoint-preserving shared-segment drag, locked route retention and disconnected/over90m link cases.
- [ ] Run the three unit files and record failures.
- [ ] Route on a room-opening/corridor/user-tray graph with obstacle checks; unknown penetration stays provisional. Support floor cabinets/backbones explicitly. Split segments at real collinear overlap boundaries; carry independent electrical identities through edits. Apply each defined allowance and reserve once; use integer millimetres internally for stable unions/rounding where appropriate.
- [ ] Rerun tests; inspect restaurant kitchen common trunk then two final branches, hotel horizontal versus backbone quantities, and deliberately invalid geometry. Unknown scale or connectivity sets blocking issues without fabricated precise totals.
- [ ] Commit routes/measurement/shared-edit deliverable.

## Task 7 — Source-backed offline catalog, allocations, quote and recommendations

**Files:** `src/catalog/{models,prices,recommendations}.ts`, `src/quote/{allocation,storage,pricing,derive}.ts`, `src/topology/graph.ts`, `tests/unit/{allocation,pricing,optional,topology}.test.ts`, `docs/price-evidence.md`.

**Interfaces:** `deriveProject(project,catalog): DerivedProject` and `buildTopology(project,derived): TopologyGraph`. Catalog entries distinguish exact model/spec evidence, snapshot date/page price, estimate and user override. Allocation identifies actual switches/endpoints/uplinks; topology reuses it rather than recomputing inventory.

- [ ] Write failures with fixed catalog fixtures: AP4×39500c=158000c; modifying quantity changes real dependent allocations; integrated AC incurs no extra AC item; PoE reserve applies per switch; NVR channels/disk bays/retention checked. For optional drafts derive total unchanged; joining an existing wired PC charges0 hardware but adds one real network endpoint; removal restores baseline; monitoring off removes its cables/recorder/storage but retains dormant manual camera state for reenable. Add insufficient/unknown capacity tests and topology node-count/membership assertions.
- [ ] Run focused tests and record RED before implementation.
- [ ] Research exact compatible Mainland devices from primary manufacturer specs and readable retailer product pages, not search-card lowest prices. Record unresolved costs and source conditions. Implement constrained economic switch selection, integrated AC compatibility, channels/storage, box versus per-metre cable purchase, exclusive fixed/itemized labor and cents arithmetic. Add affirmative scene-specific optional join/purchase/existing modes and generation compatibility. No floor multiplication of shared global gateway/NVR purchases.
- [ ] Run all quote tests and independent BOM arithmetic checks for five scenes. Prices remain truthful even if the resulting estimate is not the lowest. Assert graph endpoints correspond exactly to actual active placements and recorder does not fictitiously supply PoE ports.
- [ ] Commit catalog snapshot, evidence and quote/topology engines. No runtime ecommerce dependency.

## Task 8 — Atomic local projects and safe portable bundles

**Files:** `src/project/{repository,bundle,transactions}.ts`, native `ProjectStorePlugin.kt`, `tests/unit/{persistence,bundle}.test.ts`, Android `ProjectStoreTest.kt`.

**Interfaces:** repository `list/load/save/delete` uses stable project IDs and private files; `save(project,expectedRevision)` returns revision or explicit conflict; `exportBundle/importBundle` use a versioned `.netatelier` ZIP with JSON and assets, validating every reference. No persisted second BOM truth.

- [ ] Write failures: save→load roundtrip preserves coordinates/locks/radio/price overrides/image bytes; interrupted atomic save restores last good version; import unknown schema, `../`/absolute archive paths, duplicate asset names and zip-bomb expansion must reject without changing existing projects. Bundle limits: uncompressed≤128MiB,≤256 entries, project≤20floors; fail before extraction beyond bounds.
- [ ] Run unit and native storage tests to establish RED.
- [ ] Implement private temp-write/atomic replace with one recovery version, revision guards and manifest-referenced assets. Use native file streaming or bounded chunks instead of serializing large images into undo history. Validate bundle size/path/schema before applying. Explicit delete confirmation affects only private copies, never original user files; exclude app projects from cloud backup.
- [ ] Rerun tests, force-stop/restart between saves and verify recovery on device. Export/import into fresh app storage without relying on old cached file paths.
- [ ] Commit persistence and recovery tests.

## Task 9 — Mobile editor, quote panel and independent topology UI

**Files:** `src/ui/{HomePage,PlannerPage,FloorplanCanvas,DeviceConfigPanel,Inspector,QuotePanel,RecommendationPanel,TopologyPage}.tsx`, `src/ui/styles.css`, `tests/web/{scenes,editing,quote,topology}.spec.ts`.

**Interfaces:** UI reads applied Project plus DerivedProject; dispatches `ProjectEdit`. Unapplied draft counts/radio/recommendations have no engine or persistence side effects. Shared selection maps physical IDs to topology nodes; one operation is one undo transaction.

- [ ] Write web failures for five scenes, hotel layer scope, draft/apply/cancel, blocked navigation with drafts, protected reductions, click-without-add, drag/undo/redo, explicit add mode and optional join/remove. Add quote/topology synchronized assertions, system-back/immersive exit hooks and phone/tablet viewport overflow checks.
- [ ] Run `npm run test:web -- tests/web/scenes.spec.ts tests/web/editing.spec.ts tests/web/quote.spec.ts tests/web/topology.spec.ts` against the current skeleton; confirm missing-feature failures.
- [ ] Build touch-first UI: pannable/pinchable SVG, explicit selected-device dragging, stable engineering anchors and bounded label/icon leaders; blue/orange shared paths, selected-only brief emphasis, reduced-motion respect. Dome icons do not erase camera target semantics. Implement clear required/optional totals, sources/unknowns, saved-state and multi-floor selector. Native immersive mode must keep exits, system insets, dropdowns and save reachable.
- [ ] Run browser suite, then inspect actual emulator portrait/landscape/tablet screens and manually use pinch/drag/back. Labels/paths cannot be accepted by DOM-count checks alone. Test local page reload and lifecycle recovery using Task8 storage.
- [ ] Commit UI, tests and small reviewed public screenshots; exclude private runtime data.

## Task 10 — Real SVG/PNG/CSV/PDF and project export delivery

**Files:** `src/export/{svg,csv,report,index}.ts`, native `ExportPlugin.kt`, `tests/unit/export.test.ts`, `tests/web/export.spec.ts`, Android `ExportTest.kt`.

**Interfaces:** implements `renderExport`; native `saveArtifact` invokes system document creation, and `renderReportPdf` produces locally paginated PDF with embedded fonts/images. File cancel returns cancelled without mutating project. SVG includes true engineering anchors and readable legend; project bundle export uses Task8.

- [ ] Write failures: five-scene SVG parses, selected hotel floor export differs from full-project report; CSV totals remain exact and text beginning `=`, `+`, `-`, `@` cannot execute as formulas; quoted commas/newlines correctly escaped; PDF includes every floor, BOM lines, assumptions and unresolved issues with Chinese text. System-save cancellation leaves project identical.
- [ ] Run unit/native/browser export tests and record RED at the layer that owns each behavior; do not mock a downloaded file as proof of SAF success.
- [ ] Implement renderers and actual native file destinations/sharing/print-to-PDF; use bundled fonts and no cloud conversion. Distinguish current-floor versus whole-project output. Include date/version and dated price sources; prevent table rows and diagram legends being clipped.
- [ ] Save and reopen actual SVG/PNG/CSV/PDF/bundle files on device; render PDFs for visual inspection and verify all hotel floors plus total reconciliation. Record successful/cancel/error cases with safe sample data.
- [ ] Commit export functionality and tests.

## Task 11 — Full Android acceptance, offline lifecycle and security review

**Files:** `scripts/{verify,android-acceptance,scan-public-content}.mjs`, `.github/workflows/android-check.yml`, `docs/acceptance.md`, expand regression tests as failures are found.

**Interfaces:** verification runner executes explicit commands and writes results with commit/run IDs; it never rewrites expected outcomes or publishes. Android acceptance uses a known emulator handle/device serial and bounded waits, not blind sleep/restart loops.

- [ ] Turn the spec's complete acceptance matrix into executable checks plus enumerated screenshot/manual assertions. Add regressions before fixing any observed failure. ReviewFocus1–5 must each have recorded cases and no silent skipped gates.
- [ ] Run all unit/type/build/web/native tests and a fresh offline installation before first OCR. Exercise three independent uploaded drawings, five scenes, four-floor hotel, gestures, back/fullscreen, locked/dormant devices, optional joins, process death, low-quality recognition and actual export/import. Use public/synthetic inputs with documented provenance, never user's unapproved private images.
- [ ] Inspect screenshots at1440×900,1920×1080 and phone390×844 logical viewport plus actual Android portrait/landscape/tablet captures; distinguish web from device evidence. Check error logs, sources, permissions, external requests, data backup behavior and dependency notices.
- [ ] Fix failures via focused RED/GREEN cycles and rerun affected/full gates. Record unavailable real-device coverage honestly; no emulator pass is claimed as a test on the user's phone. Validate README in a clean checkout with pinned dependencies and documented local build steps.
- [ ] Commit verified code and concise acceptance report. Preserve full local artifacts outside public commit scope unless reviewed. Request a fresh whole-branch review according to the execution method selected by the user; do not substitute self-review while claiming independence.

## Task 12 — Signed verification APK and public GitHub delivery

**Files:** `scripts/release.mjs`, `README.md`, `docs/{install,build,privacy,third-party-notices}.md`, release manifest with SHA-256/package/version/source commit (no signing secrets).

**Interfaces:** release script builds from a clean known commit using a local ignored signing configuration and outputs a signed APK plus hash manifest. Test/distribution keys remain outside the repo; never borrow another app's signing key. Public CI can build explicitly labelled debug validation artifacts, not pretend its ephemeral key is the user's release identity.

- [ ] Write failure checks for dirty source, missing signing configuration, mismatched package/version, a secret-bearing tracked file and mismatched hash. Run before release implementation; no test performs a remote write.
- [ ] Implement local signed verification build and release metadata. Verify with `apksigner verify --print-certs`, inspect package/minSdk/version, install that exact APK and repeat startup/OCR/save smoke offline. Document private key backup location to the user, not its contents in public docs; never publish signing material.
- [ ] Revalidate `gh api user` is `rewqasd`, repository target is still unused, and public-content scan covers all tracked files/history and fixture rights. Create `rewqasd/netatelier-android` as PUBLIC, push only the reviewed new repository, and publish a tagged verification Release with APK/hash. These are authorized goal actions; no server deployment or old-repo mutation. If the name is now occupied, stop and resolve rather than overwrite.
- [ ] Fetch public repo/Release metadata and download the published APK to a separate temporary directory. Compare its SHA-256 to the installed verified APK; confirm the source tag matches the release manifest and links work. Remote upload alone is not successful delivery.
- [ ] Final audit each explicit spec requirement against current evidence. Hand off public repository URL, direct release page, local APK path, supported Android versions, install/build instructions, limitations and key-backup guidance. Mark the goal complete only if APK/runtime verification and public delivery both pass; otherwise leave remaining work explicit.

## Coverage and Handoff

- Spec1–3: Tasks1/3/8/11/12; Spec4: Tasks2/9; Spec5: Tasks3/4; Spec6: Tasks1/5/8/9.
- Spec7: Tasks2/5/9; Spec8: Task6; Spec9: Task7; Spec10: Tasks7/9/10; Spec11: Tasks1/11/12; Spec12–14: Tasks11/12 and evidence notes throughout.
- Task order is sequential because later engines consume the previous tasks' exact metric and identity contracts. Early shell APKs are internal milestones, not a reduced final product.
- Recommended execution: native/in-session implementation with one fresh whole-branch reviewer before publication. Alternative: subagent-driven task implementation/review. User chooses the method after reviewing this plan; do not auto-dispatch implementation workers during plan writing.
- This plan has been checked for missing spec coverage, interface naming, the five Review Focus failure classes and scope. Detailed dependency pins, retailer observations and screenshots must come from actual execution, not be invented in this plan.
