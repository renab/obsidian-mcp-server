import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { VaultProvisioner } from '../src/services/vault-provisioner.js';
import { VaultRegistry } from '../src/services/vault-registry.js';
import { VAULT_TOOLS } from '../src/tools/vault-tools.js';

test('provisioner rejects traversal and dangerous repository names before creating files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-security-'));
  const provisioner = new VaultProvisioner(root, new VaultRegistry(join(root, 'registry.json')));
  await assert.rejects(provisioner.create({ id: '../escape', name: 'Escape', gitEnabled: false }), /Vault ID/);
  await assert.rejects(provisioner.create({ id: 'safe', name: 'Safe', githubRepoName: 'bad;name', gitEnabled: false }), /repository name/);
  await assert.rejects(provisioner.create({ id: 'safe', name: 'Safe', githubRepoName: '--private', gitEnabled: false }), /repository name/);
  await assert.rejects(provisioner.create({ id: 'safe', name: 'Unsafe\nName', gitEnabled: false }), /display name/);
});

test('existing-vault import cannot escape the configured vault root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-root-'));
  const outside = await mkdtemp(join(tmpdir(), 'vault-outside-'));
  const provisioner = new VaultProvisioner(root, new VaultRegistry(join(root, 'registry.json')), undefined, false);
  await assert.rejects(provisioner.register({ id: 'outside', name: 'Outside', vaultPath: outside, apiKey: 'key', restPort: 27124 }), /escapes OBSIDIAN_VAULT_ROOT/);
});

test('MCP exposes no remote repository deletion capability', () => {
  const schemas = JSON.stringify(VAULT_TOOLS).toLowerCase();
  assert.doesNotMatch(schemas, /delete_repository|delete_remote|repo delete/);
  assert.ok(VAULT_TOOLS.some((tool) => tool.name === 'unregister_vault'));
});
