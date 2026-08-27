# Full objective implementation checklist

This checklist mirrors the user-provided implementation order and remains the completion gate even when the in-app plan is summarized into broader workstreams.

1. [ ] Preserve the upstream baseline; the extended fork builds, but the untouched checkout's initial build was blocked by its dependency-script policy and is recorded as such.
2. [x] Add tests around current multi-vault configuration.
3. [x] Refactor configuration into runtime `VaultRegistry`.
4. [x] Preserve registry/file/JSON/legacy environment compatibility.
5. [x] Add `register_vault` and `unregister_vault`.
6. [x] Test that existing Git-backed imports preserve repository state.
7. [x] Test dynamic vault replacement without restart.
8. [x] Import Sweetwater into a development registry without changing Git history.
9. [x] Analyze Sweetwater's reusable organization and writing conventions.
10. [x] Add template manager.
11. [x] Build generalized `book-project` template.
12. [x] Build `eve-character` template.
13. [x] Add secure, OS-aware port allocator.
14. [x] Add constrained filesystem provisioning.
15. [x] Initialize Git only for new vaults.
16. [x] Add private GitHub creation through argument-safe `gh` calls.
17. [x] Add Git status, commit, sync, and history tools.
18. [x] Generate Local REST API configuration with per-vault secrets excluded from Git.
19. [x] Configure Obsidian Git and install required plugin release assets when available.
20. [x] Add `create_vault`.
21. [x] Add migration and secret-management documentation.
22. [ ] Sweetwater import, repository preservation, plugin installation, registry routing, and secret exclusion are verified; live REST awaits Obsidian availability.
23. [x] Create and verify a private-repository EVE-character test vault (correctly offline until opened in Obsidian).
24. [x] Create and verify a private-repository book-project test vault (correctly offline until opened in Obsidian).
25. [ ] One MCP process routes three registered vaults independently; simultaneous live REST awaits Obsidian availability.
26. [ ] All three are independently addressable for local tools; live REST addressability remains open.
27. [x] Audit schemas and code for absence of remote repository deletion.
28. [ ] Consider retiring the original Sweetwater MCP only after feature parity; retirement is not automatic.

The project is not complete until the full Definition of Done—including live Obsidian REST health, independent private remotes, secret audit, Sweetwater preservation, upstream compatibility, and old-MCP parity—is verified.
