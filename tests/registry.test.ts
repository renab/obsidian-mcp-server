import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createTemplateManager } from './template-fixture.js';
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
  const root = await mkdtemp(join(tmpdir(), 'vault-template-'));
  const registry = new VaultRegistry(join(root, 'registry.json'));
  const manager = await createTemplateManager(root, registry);
  assert.deepEqual((await manager.list()).map((item) => item.id).sort(), ['book-project', 'default', 'eve-character']);
  const destination = join(root, 'book');
  await manager.instantiate('book-project', destination, { VAULT_ID: 'novel', VAULT_NAME: 'Novel', CREATED_DATE: '2026-01-01',
    GITHUB_REPOSITORY: 'obsidian-novel', REST_API_PORT: '27124', REST_API_KEY: 'test-secret' });
  const home = await readFile(join(destination, 'Home.md'), 'utf8');
  assert.match(home, /Novel/);
  const textualFiles = (await readdir(destination, { recursive: true }))
    .filter((path) => /(?:\.md|\.json|\.gitignore)$/.test(path));
  const allTemplateText = (await Promise.all(textualFiles.map((path) => readFile(join(destination, path), 'utf8')))).join('\n');
  assert.doesNotMatch(allTemplateText, /Sweetwater/i);
});

test('template refresh discovers a manually-created template and reports invalid templates safely', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-template-refresh-'));
  const registry = new VaultRegistry(join(root, 'registry.json'));
  const manager = await createTemplateManager(root, registry);
  const templateRoot = join(root, 'template-source', 'Templates');
  const custom = join(templateRoot, 'Manual Template');
  await mkdir(join(custom, 'vault'), { recursive: true });
  await writeFile(join(custom, 'template.json'), JSON.stringify({ schemaVersion: 1, id: 'manual-template', name: 'Manual Template', version: '1.0.0', vaultRoot: 'vault', enabled: true }));
  await writeFile(join(custom, 'vault', 'Home.md'), '# Manual');
  const broken = join(templateRoot, 'Broken Template');
  await mkdir(broken, { recursive: true });
  await writeFile(join(broken, 'template.json'), '{invalid');
  const refreshed = await manager.refresh();
  assert.ok(refreshed.templates.some((item) => item.id === 'manual-template'));
  assert.ok(refreshed.invalid.some((item) => item.directory === 'Broken Template'));
});
