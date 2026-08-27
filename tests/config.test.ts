import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { loadConfig, replaceConfiguredVaults, resetConfig } from '../src/config.js';

test('managed registry takes precedence and runtime vault replacement is immediate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-config-'));
  const registryPath = join(root, 'registry.json');
  await writeFile(registryPath, JSON.stringify({ version: 1, nextRestPort: 27125, vaults: [{
    id: 'managed', apiKey: 'secret', host: '127.0.0.1', port: 27124, protocol: 'https', vaultPath: root,
  }] }));
  const previous = { ...process.env };
  try {
    process.env.OBSIDIAN_VAULT_REGISTRY = registryPath;
    process.env.OBSIDIAN_VAULTS_JSON = JSON.stringify([{ id: 'legacy', apiKey: 'other' }]);
    const config = loadConfig();
    assert.deepEqual(Object.keys(config.vaults), ['managed']);
    resetConfig();
    const replaced = replaceConfiguredVaults([{ id: 'new-vault', apiKey: 'new-secret', host: '127.0.0.1', port: 27125, protocol: 'https' }]);
    assert.ok(replaced.vaults['new-vault']);
  } finally {
    process.env = previous;
    resetConfig();
  }
});

test('file, inline JSON, and legacy single-vault configuration remain supported', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-config-'));
  const file = join(root, 'vaults.json');
  await writeFile(file, JSON.stringify([{ id: 'file-vault', apiKey: 'file-secret' }]));
  const previous = { ...process.env };
  try {
    delete process.env.OBSIDIAN_VAULT_REGISTRY;
    process.env.OBSIDIAN_VAULTS_FILE = file;
    assert.ok(loadConfig().vaults['file-vault']);
    delete process.env.OBSIDIAN_VAULTS_FILE;
    process.env.OBSIDIAN_VAULTS_JSON = JSON.stringify([{ id: 'json-vault', apiKey: 'json-secret' }]);
    assert.ok(loadConfig().vaults['json-vault']);
    delete process.env.OBSIDIAN_VAULTS_JSON;
    process.env.OBSIDIAN_API_KEY = 'legacy-secret';
    assert.ok(loadConfig().vaults.default);
  } finally {
    process.env = previous;
  }
});
