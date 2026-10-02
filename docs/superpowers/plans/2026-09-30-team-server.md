# Team server implementation plan

Goal: private loopback-only team/project/vision draft workflow, preserving offline Android.
Spec: ../specs/2026-09-30-team-server-design.md
Execution: user explicitly requests continued implementation and parallel progress; use independent agents with owned files, integration and review in root.

- [ ] Backend task: server/auth.mjs, server/store.mjs, server/app.mjs, server/admin.mjs; consume createVisionAdapter recognize API; expose spec REST contract. Write and run failing node:test API tests, implement Argon2id sessions/Origin/membership/object authorization/CRUD and bootstrap terminal prompt, run full server tests. Cases: expired/logout session, wrong password, two-tenant object/task access, admin/member escalation, last owner, conflict and malformed request. SQLite persistence restart.
- [ ] Vision task: server/vision.mjs + server/vision.test.mjs; exact adapter and bounded draft schema in spec. Tests first: disabled default/no network, no consent, image limit, invalid MIME, response errors/timeout/empty/truncated/unsafe schema; mocked successful response. Implement HTTPS fixed provider only, opaque errors, deterministic data.
- [ ] Frontend task: team.html, cloud/TeamApp.tsx and cloud/team.css + tests/fixtures/team API synthetic host and tests/web/team.spec.ts; expose user-readable Chinese management workflow matching contract. Prevent stale tenant responses, no image call before consent, deterministic SVG/table correction. Test browser login/tenant/project lifecycle and safe renderer.
- [ ] Deployment/integration task: Vite multi-entry, npm team scripts, deploy/Dockerfile and compose.yaml, deploy/check-local.mjs and docs/private-deployment.md. No secrets values; interactive user setup. Build package and unit/API/browser tests, verify only loopback binding and host checks. Self-review then fresh code review. Commit reviewable branch, push draft PR, verify exact SHA CI. SSH requires user confirmed auth; preflight read-only prior isolated deployment, no existing service mutation.

Review focus: tenant switching pending requests; all task/output getters binding to parent project; invalid image and giant model output; CSRF/host-origin mismatch behind tunnel; data persistence and file permissions on nonroot deployment. Public password access/TLS remains disabled until separate authorized configuration.
