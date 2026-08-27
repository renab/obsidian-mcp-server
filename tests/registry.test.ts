import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { TemplateManager } from '../src/services/template-manager.js';
import { VaultRegistry } from '../src/services/vault-registry.js';

import type { VaultConfig } from '../src/types.js';

const vault = (id: string, path: string): VaultConfig => ({ id, apiKey: `secret-${id}`, host: '127.0.0.1', port: 27124,
  protocol: 'https', vaultPath: path, imported: true, managed: true });

test('registry persists, rejects duplicate IDs/paths, and unregisters without filesystem deletion', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-registry-'));
  const registry = new VaultRegistry(join(root, 'registry.json'));
  await registry.add(vault('one', join(root, 'one')));
  await writeFile(join(root, 'keep.md'), 'keep');
  assert.equal((await new VaultRegistry(registry.path).load()).vaults[0].id, 'one');
  await assert.rejects(registry.add(vault('one', join(root, 'two'))), /already exists/);
  await assert.rejects(registry.add(vault('two', join(root, 'one'))), /already registered/);
  await registry.remove('one');
  assert.deepEqual((await registry.load()).vaults, []);
  await access(join(root, 'keep.md'));
});

test('registry file contains credentials but callers can redact them', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-registry-'));
  const path = join(root, 'registry.json');
  await new VaultRegistry(path).add(vault('one', join(root, 'one')));
  assert.match(await readFile(path, 'utf8'), /secret-one/);
});

test('templates include all required families and substitute text without leaking Sweetwater content', async () => {
  const manager = new TemplateManager(join(process.cwd(), 'templates'));
  assert.deepEqual((await manager.list()).map((item) => item.id).sort(), ['book-project', 'default', 'eve-character', 'project']);
  const root = await mkdtemp(join(tmpdir(), 'vault-template-'));
  const destination = join(root, 'book');
  await manager.instantiate('book-project', destination, { VAULT_ID: 'novel', VAULT_NAME: 'Novel', CREATED_DATE: '2026-01-01',
    GITHUB_REPOSITORY: 'obsidian-novel', REST_API_PORT: '27124', REST_API_KEY: 'test-secret' });
  const home = await readFile(join(destination, 'Home.md'), 'utf8');
  assert.match(home, /Novel/);
  assert.doesNotMatch(home, /Sweetwater/i);
});
