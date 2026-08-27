# Sweetwater structural analysis

This analysis intentionally records generalized organization only. It excludes story prose, personal notes, credentials, and Sweetwater-specific facts.

## Patterns retained

- Domain areas use nearby `Index.md` navigation notes rather than relying on one global table of contents.
- Manuscript material is separated from planning notes and the broader story bible.
- Chapters and scenes are independently addressable notes, making links, status tracking, and targeted MCP retrieval practical.
- Continuity is a first-class area with a ledger, open questions, timelines, relationships, recurring entities, and rules tracked separately.
- Reusable object templates and metadata schemas provide stable note types for characters, locations, chapters/scenes, mysteries, and continuity issues.
- Typed YAML frontmatter supports Dataview-style aggregation without encoding project-specific behavior in the MCP.
- Working notes are clearly distinguished from canonical reference material.
- The proven writing-oriented plugin set includes Longform, Dataview, Templater, metadata helpers, and Git; provisioned templates declare only the broadly reusable subset.

## Generalization decisions

The `book-project` template translates those patterns into neutral project, planning, research, story-bible, manuscript, continuity, revision, and publishing areas. It retains index-note navigation, linkable manuscript units, status-bearing frontmatter, continuity trackers, and reusable object templates. It does not preserve the source vault's names, plot, setting, characters, directory labels tied to its fictional universe, plugin backup data, workspaces, or existing prose.

The source vault's Git automation settings are not copied. Newly provisioned vaults use documented ten-minute defaults; imported vaults keep their existing Obsidian Git configuration unchanged.
