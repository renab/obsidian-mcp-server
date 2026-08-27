# Obsidian MCP Server

> This fork extends the upstream server with dynamic, registry-backed multi-vault management while preserving the existing `vaultId` routing model.

## Managed multi-vault architecture

One MCP process can serve any number of independently addressable Obsidian vaults. Each managed vault has its own directory, Local REST API key and port, lifecycle state, and—normally—its own Git repository. The mutable registry is reloaded into the running server after every management operation, so a newly registered vault is immediately accepted by existing read, write, search, graph, and semantic tools without changing MCP client configuration.

Configuration precedence is:

1. A non-empty `OBSIDIAN_VAULT_REGISTRY` document.
2. `OBSIDIAN_VAULTS_FILE`.
3. `OBSIDIAN_VAULTS_JSON`.
4. Legacy `OBSIDIAN_API_KEY` and related single-vault variables.

The registry contains Local REST credentials and must remain outside every vault repository. It is written atomically with owner-only permissions where the operating system supports them. API keys are never returned by management tools or placed in `.mcp-vault.json`.

### Windows configuration

```powershell
$env:OBSIDIAN_VAULT_ROOT = 'C:\Users\you\Obsidian'
$env:OBSIDIAN_VAULT_REGISTRY = 'C:\Users\you\.config\obsidian-mcp\vault-registry.json'
$env:OBSIDIAN_API_KEY = 'bootstrap-key'
```

`OBSIDIAN_VAULT_ROOT` constrains newly created directories. IDs must be lowercase slugs, repository names are validated, paths are canonicalized, and native Git/GitHub commands are invoked with argument arrays rather than interpolated shell commands.

### GitHub prerequisites

Install Git and GitHub CLI, then authenticate once:

```powershell
git --version
gh --version
gh auth login
gh auth status
```

When authenticated, `create_vault` creates a private repository and pushes the deterministic initial commit. If GitHub provisioning is unavailable, the filesystem and local-Git result is reported accurately. A repository created before a later failure is deliberately preserved and reported.

Remote repository deletion is not supported. There is no deletion tool, configuration switch, rollback step, or unregister option capable of deleting a GitHub repository. `unregister_vault` changes only the MCP registry.

## Vault management tools

- `create_vault`: instantiate a template, generate an independent API key, allocate a free port in 27124–27299, initialize Git, optionally create a private GitHub repository, and register the vault.
- `register_vault`: import an existing vault without running `git init`, changing its branch or remote, or rewriting its history.
- `unregister_vault`: remove only the registry entry.
- `get_vault_info` and `list_vaults`: return lifecycle, REST, Git, repository, template, and capability state without credentials.
- `list_vault_templates`: list `default`, `project`, `eve-character`, and `book-project`.
- `git_status`, `git_commit`, `git_history`, and `git_sync`: scoped native-Git operations. Commit does not push; sync reports conflicts rather than resolving them destructively.

Example creation request:

```json
{
  "id": "eve-wormhole-alpha",
  "name": "EVE - Wormhole Alpha",
  "template": "eve-character",
  "githubRepoName": "obsidian-eve-wormhole-alpha"
}
```

Filesystem creation can succeed while Obsidian is closed. Such a vault is `offline`, not falsely `connected`; open it in Obsidian and enable/install the community plugins named in `.obsidian/community-plugins.json` before expecting REST connectivity.

## Templates and Obsidian configuration

Templates track safe Obsidian settings and declare Obsidian Git plus Local REST API. Workspace files and Local REST API `data.json` are ignored because they are machine-specific or secret-bearing. The rest of `.obsidian` is intentionally not ignored, allowing safe plugin settings to travel between machines. Obsidian Git defaults to pull on open and ten-minute commit/push intervals.

The `book-project` template generalizes structural conventions observed in the existing Sweetwater writing vault without copying its prose or project-specific facts: linked index notes, typed frontmatter, separate planning/research/manuscript/story-bible/continuity/revision/publishing areas, independently linkable chapters, continuity trackers, and object templates. It includes templates for chapters, sources, characters, locations, revision issues, decisions, and open questions.

## Importing Sweetwater or another Git-backed vault

Back up the vault first. Then call `register_vault` with its existing path, ID, name, REST key, and port. Registration detects `.git`, reads the branch and origin, preserves history and remote configuration, appends only missing secret/workspace exclusions to the existing `.gitignore`, and writes non-secret `.mcp-vault.json` metadata. It never initializes or replaces the repository.

For Sweetwater migration, run the old and new MCPs in parallel until read/write/search and Git behavior match. Do not retire the old MCP until the new server can address Sweetwater and at least two provisioned vaults independently and their Local REST endpoints are healthy.

## Troubleshooting

- `OBSIDIAN_VAULT_REGISTRY must be configured`: set an absolute registry path outside vault repositories.
- GitHub repository not created: check `gh auth status`; the server degrades without crashing.
- Vault reports `offline`: open that vault in Obsidian and verify Local REST API is enabled on its assigned unique port.
- REST authentication fails: verify the ignored plugin `data.json` matches the registry; never commit or paste the key into logs.
- Git sync conflicts: resolve them manually; the MCP does not overwrite conflicts or reset local changes.

[![npm version](https://img.shields.io/npm/v/@connorbritain/obsidian-mcp-server.svg)](https://www.npmjs.com/package/@connorbritain/obsidian-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript MCP server for Obsidian with core vault operations, graph analytics, and semantic search.

## Features

- **Core Tools**: Read, write, search, append, delete files in your Obsidian vault
- **Periodic Notes**: Access daily, weekly, monthly notes and recent changes
- **Advanced Search**: JsonLogic queries for complex filtering
- **Graph Tools**: Orphan detection, centrality analysis, cluster detection, path finding
- **Semantic Search**: Smart Connections integration for concept-based search

## Prerequisites

- Node.js 18+
- [Obsidian](https://obsidian.md/) with [Local REST API plugin](https://github.com/coddingtonbear/obsidian-local-rest-api) installed and enabled
- (Optional) [Dataview plugin](https://github.com/blacksmithgu/obsidian-dataview) for `get_recent_changes`
- (Optional) [Periodic Notes plugin](https://github.com/liamcain/obsidian-periodic-notes) for periodic note tools
- (Optional) [Smart Connections plugin](https://github.com/brianpetro/obsidian-smart-connections) for semantic search

## Installation

### From npm

```bash
npm install -g @connorbritain/obsidian-mcp-server
```

### From source

```bash
git clone git@github.com:renab/obsidian-mcp-server.git
cd obsidian-mcp-server
pnpm install
pnpm run build
```

The upstream npm package does not include this fork's vault-management extensions; install the fork from source for the workflows documented above.

## Configuration

Set the following environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OBSIDIAN_API_KEY` | Yes* | - | API key from Local REST API plugin settings (used when multi-vault JSON is not supplied) |
| `OBSIDIAN_HOST` | No | `127.0.0.1` | Obsidian REST API host |
| `OBSIDIAN_PORT` | No | `27124` | Obsidian REST API port |
| `OBSIDIAN_PROTOCOL` | No | `https` | `http` or `https` |
| `OBSIDIAN_VAULT_PATH` | No | - | Path to vault (required for graph tools) |
| `SMART_CONNECTIONS_PORT` | No | - | Port for Smart Connections API |
| `GRAPH_CACHE_TTL` | No | `300` | Graph cache TTL in seconds |
| `OBSIDIAN_VAULTS_JSON` | No | - | JSON string describing one or more vaults. Overrides the single `OBSIDIAN_API_KEY` style config. |
| `OBSIDIAN_VAULTS_FILE` | No | - | Path to a JSON file describing one or more vaults (same shape as `OBSIDIAN_VAULTS_JSON`). |
| `OBSIDIAN_VAULT_REGISTRY` | For management | - | Mutable registry path outside all vault repositories. Takes precedence when non-empty. |
| `OBSIDIAN_VAULT_ROOT` | For creation/import | - | Canonical parent directory allowed for managed vault filesystem access. |
| `OBSIDIAN_DEFAULT_VAULT` | No | first defined | Name/ID of the vault to use when a tool call omits `vaultId`. |

> **Multi-vault note:** If neither `OBSIDIAN_VAULTS_JSON` nor `OBSIDIAN_VAULTS_FILE` is provided, the legacy single-vault env vars (`OBSIDIAN_API_KEY`, `OBSIDIAN_HOST`, etc.) are used to create a `default` vault entry automatically.

### Example `OBSIDIAN_VAULTS_JSON`

```json
[
  {
    "id": "work",
    "apiKey": "work-api-key",
    "host": "127.0.0.1",
    "port": 27124,
    "protocol": "https",
    "vaultPath": "C:/Users/you/Obsidian/work",
    "smartConnectionsPort": 29327
  },
  {
    "id": "personal",
    "apiKey": "personal-api-key",
    "vaultPath": "C:/Users/you/Obsidian/personal"
  }
]
```

Each tool in the MCP server now accepts an optional `vaultId` argument. When omitted, the server uses `OBSIDIAN_DEFAULT_VAULT` (or the first defined vault). This allows a single MCP session to read/write multiple vaults just by specifying which vault to target in the tool call.

### Multi-Vault Port Configuration

> **Important:** When running multiple Obsidian vaults simultaneously, each vault's Local REST API plugin must listen on a **unique port**. By default, all vaults use port `27124`, which causes conflicts—only one vault can bind to a port at a time, and requests to other vaults will fail with authorization errors.

#### Step 1: Assign Unique Ports in Obsidian

For each vault, open **Settings → Community Plugins → Local REST API** and scroll to **Advanced Settings**:

1. Set **Encrypted (HTTPS) Server Port** to a unique value (e.g., `27124`, `27125`, `27126`, `27127`)
2. Toggle the plugin off and back on (or restart Obsidian) to apply the change
3. Copy the **API Key** shown in the plugin settings

#### Step 2: Update Your Vaults JSON

In your `obsidian-vaults.json` file (or `OBSIDIAN_VAULTS_JSON` env var), specify the `port` for each vault to match what you configured in the plugin:

```json
[
  {
    "id": "vault_one",
    "apiKey": "your-api-key-for-vault-one",
    "port": 27124,
    "vaultPath": "C:/Users/you/Obsidian/vault_one"
  },
  {
    "id": "vault_two",
    "apiKey": "your-api-key-for-vault-two",
    "port": 27125,
    "vaultPath": "C:/Users/you/Obsidian/vault_two"
  },
  {
    "id": "vault_three",
    "apiKey": "your-api-key-for-vault-three",
    "port": 27126,
    "vaultPath": "C:/Users/you/Obsidian/vault_three"
  }
]
```

#### Step 3: Reload static configuration only when needed

After updating legacy `OBSIDIAN_VAULTS_FILE` or `OBSIDIAN_VAULTS_JSON`, restart your MCP client so it reloads static configuration. Managed registry changes made through `create_vault`, `register_vault`, or `unregister_vault` refresh the running process immediately and do not require a restart.

#### Verifying Connectivity

You can test each vault's API directly with curl:

```bash
# Replace PORT and API_KEY for each vault
curl -k -H "Authorization: Bearer YOUR_API_KEY" https://127.0.0.1:PORT/vault/
```

A successful response returns a JSON object with the vault's file listing. If you receive `40101 Authorization required`, the API key doesn't match. If you receive `40400 Not Found`, the plugin isn't fully initialized on that port—try toggling it off/on or restarting the vault.

## MCP Client Configuration

### Using the upstream npm package

This preserves the upstream static configuration but does not include this fork's management extensions:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "@connorbritain/obsidian-mcp-server"],
      "env": {
        "OBSIDIAN_API_KEY": "your-api-key-here",
        "OBSIDIAN_VAULT_PATH": "/path/to/your/vault",
        "OBSIDIAN_VAULTS_FILE": "C:/path/to/vaults.json",
        "OBSIDIAN_DEFAULT_VAULT": "work"
      }
    }
  }
}
```

### Using Local Build (Development)

Use the local fork build for dynamic management. Example ChatGPT/Codex-compatible MCP configuration on Windows:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/absolute/path/to/obsidian-mcp-server/dist/index.js"],
      "env": {
        "OBSIDIAN_API_KEY": "bootstrap-only-key",
        "OBSIDIAN_VAULT_ROOT": "C:/Users/you/Obsidian",
        "OBSIDIAN_VAULT_REGISTRY": "C:/Users/you/.config/obsidian-mcp/vault-registry.json"
      }
    }
  }
}
```

### Config File Locations

| Client | Config Path |
|--------|-------------|
| **Claude Desktop (Windows)** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Claude Desktop (Mac/Linux)** | `~/.config/claude/claude_desktop_config.json` |
| **Windsurf** | `~/.windsurf/mcp_config.json` |
| **Cursor** | `~/.cursor/mcp_config.json` |

## Available Tools

All tools accept an optional `vaultId` argument. If omitted, the server uses the default vault from your configuration. This lets you read/write multiple Obsidian vaults within the same MCP session.

### Vault Management

| Tool | Description |
|------|-------------|
| `list_vaults` | List all configured vaults with their IDs, capabilities, and connection info |
| `get_vault_info` | Inspect lifecycle, REST, Git, repository, template, and capability state without secrets |
| `list_vault_templates` | List reusable template families |
| `register_vault` | Import an existing vault while preserving Git state |
| `unregister_vault` | Remove only the registry entry; never delete local or remote data |
| `create_vault` | Provision a templated vault, plugins, Git, private GitHub repository, port, and registry entry |
| `git_status` / `git_commit` / `git_sync` / `git_history` | Perform scoped, non-destructive Git management |

### Core File Operations

| Tool | Description |
|------|-------------|
| `list_files_in_vault` | List all files/directories in vault root |
| `list_files_in_dir` | List files in a specific directory |
| `get_file_contents` | Read a single file |
| `batch_get_file_contents` | Read multiple files concatenated with headers |
| `delete_file` | Delete file or directory |

### Write Operations

| Tool | Description |
|------|-------------|
| `append_content` | Append to file (creates if missing) |
| `put_content` | Overwrite file content |
| ~~`patch_content`~~ | ⚠️ **Disabled**: Insert content relative to heading/block (awaiting Obsidian REST API fix - [see issue #146](https://github.com/coddingtonbear/obsidian-local-rest-api/issues/146)) |

> **Note**: The `patch_content` tool is currently disabled due to known bugs in the Obsidian Local REST API plugin. Use the read-modify-write pattern with `get_file_contents` + `put_content` as a reliable alternative.

### Search

| Tool | Description |
|------|-------------|
| `search` | Keyword search across vault |
| `complex_search` | JsonLogic query search (glob, regexp support) |
| `pattern_search` | Regex pattern extraction with context *(requires vault path)* |

### Periodic Notes & Recent Changes

| Tool | Description |
|------|-------------|
| `get_periodic_note` | Get current daily/weekly/monthly/quarterly/yearly note |
| `get_recent_periodic_notes` | Get recent periodic notes with optional content |
| `get_recent_changes` | Get recently modified files (requires Dataview) |

### Obsidian Integration

| Tool | Description |
|------|-------------|
| `get_active_file` | Get the currently active file in Obsidian |
| `open_file` | Open a file in Obsidian |
| `list_commands` | List all available Obsidian commands |
| `execute_command` | Execute one or more Obsidian commands |

### Graph Tools *(requires OBSIDIAN_VAULT_PATH)*

| Tool | Description |
|------|-------------|
| `get_vault_stats` | Overview stats (notes, links, orphans, clusters) |
| `find_orphan_notes` | Notes with no incoming/outgoing links |
| `get_note_connections` | Incoming/outgoing links + tags for a note |
| `find_path_between_notes` | Shortest link path between two notes |
| `get_most_connected_notes` | Top notes by link count or PageRank |
| `detect_note_clusters` | Community detection via graph analysis |
| `get_vault_structure` | Folder tree structure of vault |

### Semantic Tools *(requires Smart Connections plugin)*

| Tool | Description |
|------|-------------|
| `semantic_search` | Conceptual search via Smart Connections |
| `find_similar_notes` | Find semantically similar notes

## Development

```bash
# Watch mode
npm run dev

# Type check
npm run typecheck

# Build
npm run build
```

## License

MIT
