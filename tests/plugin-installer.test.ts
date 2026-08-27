import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { configureRequiredPlugins } from '../src/services/plugin-installer.js';

test('existing plugin assets and Git settings are preserved while missing REST configuration is added', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-plugins-'));
  for (const id of ['obsidian-git', 'obsidian-local-rest-api']) {
    const directory = join(root, '.obsidian', 'plugins', id);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'main.js'), `existing-${id}`);
    await writeFile(join(directory, 'manifest.json'), '{}');
  }
  const gitSettings = join(root, '.obsidian', 'plugins', 'obsidian-git', 'data.json');
  await writeFile(gitSettings, '{"custom":true}');
  await writeFile(join(root, '.obsidian', 'community-plugins.json'), '["obsidian-git"]');
  const result = await configureRequiredPlugins(root, 'private-key', 27124);
  assert.ok(result.every((plugin) => plugin.alreadyPresent));
  assert.equal(await readFile(gitSettings, 'utf8'), '{"custom":true}');
  assert.deepEqual(JSON.parse(await readFile(join(root, '.obsidian', 'community-plugins.json'), 'utf8')), ['obsidian-git', 'obsidian-local-rest-api']);
  assert.deepEqual(JSON.parse(await readFile(join(root, '.obsidian', 'plugins', 'obsidian-local-rest-api', 'data.json'), 'utf8')),
    { port: 27124, apiKey: 'private-key', enableInsecureServer: false });
});
