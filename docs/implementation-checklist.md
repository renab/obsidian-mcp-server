# Full objective implementation checklist

This checklist mirrors the user-provided implementation order and remains the completion gate even when the in-app plan is summarized into broader workstreams.

1. [x] Verify the untouched upstream commit builds and type-checks in an isolated worktree, then preserve it as the mergeable baseline.
2. [x] Add tests around current multi-vault configuration.
3. [x] Refactor configuration into runtime `VaultRegistry`.
4. [x] Preserve registry/file/JSON/legacy environment compatibility.
5. [x] Add `register_vault` and `unregister_vault`.
6. [x] Test that existing Git-backed imports preserve repository state.
7. [x] Test dynamic vault replacement without restart.
8. [x] Import Sweetwater into a development registry without changing Git history.
9. [x] Analyze Sweetwater's reusable organization and writing conventions.
10. [x] Add a dynamic template manager backed by a registered `template-source` vault.
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
22. [x] Sweetwater import, repository preservation, runtime plugin activation, live registry routing, and secret exclusion are verified.
23. [x] Create and verify a private-repository EVE-character test vault (correctly offline until opened in Obsidian).
24. [x] Create, register, commit, and push the dedicated private `obsidian-vault-templates` repository containing `default`, `book-project`, and `eve-character`.
25. [x] Discover the three required templates dynamically and verify manual-template refresh plus invalid-template reporting.
26. [x] Sweetwater, EVE, and Templates are independently addressable through one MCP process for authenticated live REST read, write, search, and cleanup.
27. [x] Audit schemas and code for absence of remote repository deletion.
28. [ ] The parity inventory identifies remaining folder/custom-sort and live REST gaps; the original Sweetwater MCP remains intact and must not be retired yet.

Per the user's later direction, no standalone Book Project demo vault is part of the active managed set. The required `book-project` template remains in the Templates vault.
