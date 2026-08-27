/**
 * Vault management tools: list vaults, get vault info
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const VAULT_TOOLS: Tool[] = [
  {
    name: 'list_vaults',
    description: 'List all configured Obsidian vaults with their IDs and capabilities.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  { name: 'get_vault_info', description: 'Inspect one vault without exposing its API key.', inputSchema: { type: 'object', properties: { vaultId: { type: 'string' } }, required: ['vaultId'] } },
  { name: 'list_vault_templates', description: 'List reusable Obsidian vault templates.', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_vault_template', description: 'Return manifest metadata and a structural summary for a dynamically discovered template.', inputSchema: { type: 'object', properties: { templateId: { type: 'string' } }, required: ['templateId'] } },
  { name: 'validate_vault_template', description: 'Validate a Templates-vault template for schema, paths, nested Git repositories, and secrets.', inputSchema: { type: 'object', properties: { templateId: { type: 'string' } }, required: ['templateId'] } },
  { name: 'refresh_vault_templates', description: 'Rescan the registered Templates vault and report valid and invalid templates.', inputSchema: { type: 'object', properties: {} } },
  { name: 'register_vault', description: 'Register an existing vault while preserving its Git history and remote.', inputSchema: { type: 'object', properties: {
    id: { type: 'string' }, name: { type: 'string' }, vaultPath: { type: 'string' }, apiKey: { type: 'string' }, restPort: { type: 'integer' }, repository: { type: 'string' }, role: { type: 'string' }
  }, required: ['id', 'name', 'vaultPath', 'apiKey', 'restPort'] } },
  { name: 'unregister_vault', description: 'Remove a vault from the registry only. Local files and remote repositories are never modified.', inputSchema: { type: 'object', properties: { vaultId: { type: 'string' } }, required: ['vaultId'] } },
  { name: 'create_vault', description: 'Provision and register a new templated vault, optionally with a private GitHub repository.', inputSchema: { type: 'object', properties: {
    id: { type: 'string' }, name: { type: 'string' }, template: { type: 'string' }, templateVariables: { type: 'object', additionalProperties: { type: 'string' } }, githubRepoName: { type: 'string' }, description: { type: 'string' }, restPort: { type: 'integer' }, gitEnabled: { type: 'boolean' }, openInObsidian: { type: 'boolean' }
  }, required: ['id', 'name'] } },
  { name: 'git_status', description: 'Show Git status for a managed vault.', inputSchema: { type: 'object', properties: { vaultId: { type: 'string' } }, required: ['vaultId'] } },
  { name: 'git_commit', description: 'Commit current vault changes without pushing.', inputSchema: { type: 'object', properties: { vaultId: { type: 'string' }, message: { type: 'string' } }, required: ['vaultId', 'message'] } },
  { name: 'git_sync', description: 'Fetch, safely rebase with autostash, and push. Conflicts are reported, never overwritten.', inputSchema: { type: 'object', properties: { vaultId: { type: 'string' } }, required: ['vaultId'] } },
  { name: 'git_history', description: 'Return compact recent Git history.', inputSchema: { type: 'object', properties: { vaultId: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 100 } }, required: ['vaultId'] } },
];
