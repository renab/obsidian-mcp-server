# Multi-vault objective completion audit

This audit records current evidence and leaves live gates explicitly open.

## Engineering requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| Untouched upstream baseline remains buildable | Proven | Commit `71c434c` built and type-checked in an isolated detached worktree. |
| Persistent mutable registry and atomic writes | Proven | Registry service plus persistence, duplicate, restart, and unregister tests. |
| Backward-compatible file/JSON/single-vault configuration | Proven | Configuration precedence tests. |
| Runtime refresh without MCP restart | Proven | Mutable configuration test and management handlers that reload registry and clear service caches. |
| Safe registration/unregistration | Proven | Real Git import test, root constraint test, local-file preservation test, and Sweetwater import evidence. |
| Port allocation | Proven | Registry-used, OS-bound, requested-range, and exhaustion tests. |
| Dedicated Templates vault and three required families | Proven | Private `obsidian-vault-templates` repository, dynamic manifest discovery, substitution tests, manual-template refresh test, and invalid-template reporting. |
| Sweetwater-derived generalized book template | Proven | Structural analysis document and generalized template tree with typed object templates. |
| New vault filesystem/Git provisioning | Proven | Real local-Git initialization/commit test and provisioned EVE vault. |
| Private GitHub repository provisioning | Proven | Separate Templates and EVE private repositories plus failure and post-remote rollback semantics tests. |
| Obsidian Git and Local REST plugin provisioning | Proven | Release assets installed in both test vaults and Sweetwater; existing Git plugin/settings preservation tested. |
| Per-vault REST keys excluded from Git | Proven | Exact-key audit for all three development vaults and real initial-commit test. |
| Management and Git MCP tools | Proven | Schemas, Git status/commit/history/sync tests, and live MCP tool inventory. |
| Lifecycle reflects endpoint health | Proven | Sweetwater, EVE, and Templates were simultaneously healthy on their assigned ports. |
| Independent REST authentication/routing | Proven live and against protocol-compatible mocks | One MCP process independently wrote, read, searched, and cleaned up an isolated note in Sweetwater, EVE, and Templates using distinct bearer keys. |
| No remote repository deletion capability | Proven | Schema test, rollback tests, source scan, and absence of any delete API/CLI implementation. |
| Documentation and Windows examples | Proven | README architecture, setup, migration, security, templates, ports, troubleshooting, and client configuration. |

## Definition of Done audit

1. Start the MCP server — **proven** by production build and live stdio integration tests.
2. Register existing Sweetwater — **proven** in the ignored development registry.
3. Preserve Sweetwater `.git`, history, branch, and remote — **proven**; pre-import HEAD remains `fd42089`, branch `master`, and origin unchanged. A complete bundle backup is verified.
4. Standard MCP read/write/search against actual Sweetwater REST — **proven** by the gated live integration test.
5. Analyze Sweetwater and produce generalized book template — **proven**.
6. Maintain the Sweetwater-derived `book-project` template — **proven** in the Templates vault. A standalone demo vault was skipped at the user's request.
7. Templates vault has its own private repository — **proven**.
8. Create `eve-wormhole-alpha` — **proven**.
9. Create its separate private GitHub repository — **proven**.
10. Initialize and push EVE and Templates — **proven**; both repositories track independent origins.
11. Obsidian Git installed/configured — **proven**, including the Templates vault.
12. Local REST configuration generated safely — **proven**, including authenticated live endpoints.
13. New vaults appear without server restart — **proven for runtime configuration and live MCP registry inventory**.
14. REST becomes healthy after loading each vault — **proven** for Sweetwater, EVE, and Templates.
15. Standard upstream tools work for each actual vault through REST — **proven** for isolated write, read, search, cleanup, inventory, and routing.
16. Additional vaults require no MCP client reconfiguration — **proven architecturally and by runtime registry tests**.
17. Each vault independently addressable — **proven live through one MCP process**.
18. Each provisioned vault pushes to a different private repository — **proven**.
19. Sweetwater continues using its existing repository — **proven**.
20. No REST/GitHub secrets in repositories — **proven by exact-secret audit**.
21. No remote deletion tool or internal path — **proven**.
22. Existing upstream multi-vault behavior still works — **proven by compatibility tests and untouched baseline build**.
23. Original Sweetwater MCP retirement — **intentionally deferred**. Core file read/write/search parity is proven, but the legacy server still exposes folder mutation and custom-sort operations that this fork does not yet replace. The safety rule requires retaining it.

## Retirement boundary

The original Sweetwater MCP has not been retired. Retirement remains a future decision after folder mutation and custom-sort parity is implemented or explicitly waived.
