# Sweetwater migration status

Sweetwater is registered in the ignored development registry and retains its original `master` branch, origin, and pre-import HEAD. A complete pre-import Git bundle exists in the ignored local backup directory. Its existing Obsidian Git installation/settings were preserved; only the missing Local REST API plugin, enablement entry, required ignore rules, and non-secret MCP metadata were added.

## Verified parity

- List/read/write/append/delete note or file operations have equivalents in the upstream REST-backed tool set.
- Search has simple, JsonLogic, regex-pattern, graph, and optional semantic variants.
- Git inspection and management are available per `vaultId`.
- One MCP process independently routes Sweetwater and both provisioned test vaults for local tools.

## Deliberately open gates

- Obsidian is not installed/running on the current host, so REST read/write/search health cannot be compared live yet.
- The old Sweetwater MCP includes filesystem-oriented folder creation, move, rename, bulk import, and Custom File Explorer Sorting helpers that do not have direct equivalents in the upstream REST tool surface.
- The old MCP must remain available until those gaps are either accepted as unnecessary, implemented safely, or covered through Obsidian commands, and live REST results match.

No retirement, archive, process removal, or configuration deletion has been performed on the original Sweetwater MCP.
