import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { createTemplateManager } from './template-fixture.js';
import { runExecutable } from '../src/services/git-service.js';
import { VaultProvisioner } from '../src/services/vault-provisioner.js';
import { VaultRegistry } from '../src/services/vault-registry.js';

const run = promisify(execFile);

test('provisions a template, substitutes variables, writes non-secret metadata, and registers dynamically', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-create-'));
  const registry = new VaultRegistry(join(root, 'registry.json'));
  const provisioner = new VaultProvisioner(root, registry, await createTemplateManager(root, registry), false);
  const result = await provisioner.create({ id: 'test-book', name: 'Test Book', template: 'book-project', gitEnabled: false });
  assert.equal(result.registryStatus, 'registered');
  assert.equal(result.lifecycle, 'offline');
  assert.match(await readFile(join(root, 'test-book', 'Home.md'), 'utf8'), /Test Book/);
  const metadata = JSON.parse(await readFile(join(root, 'test-book', '.mcp-vault.json'), 'utf8'));
  assert.deepEqual(metadata.template, { id: 'book-project', version: '1.0.0' });
  assert.doesNotMatch(JSON.stringify(metadata), /apiKey|secret/i);
  assert.ok((await registry.load()).vaults.some((vault) => vault.id === 'test-book'));
});

test('imports an existing Git repository without replacing branch, remote, history, or gitignore', async (context) => {
  if (process.platform === 'win32' && !process.env.PATH?.toLowerCase().includes('git')) context.diagnostic('Using Git from inherited PATH');
  const root = await mkdtemp(join(tmpdir(), 'vault-import-'));
  const vaultPath = join(root, 'existing');
  await run('git', ['init', '--initial-branch=preserved', vaultPath], { cwd: root }).catch(async () => run('git', ['init', vaultPath]));
  await access(vaultPath).catch(async () => { throw new Error('Git test fixture was not created'); });
  await writeFile(join(vaultPath, '.gitignore'), 'custom-rule\n');
  await writeFile(join(vaultPath, 'note.md'), '# Existing\n');
  await run('git', ['config', 'user.email', 'test@example.invalid'], { cwd: vaultPath });
  await run('git', ['config', 'user.name', 'Test'], { cwd: vaultPath });
  await run('git', ['add', '.'], { cwd: vaultPath });
  await run('git', ['commit', '-m', 'preserve me'], { cwd: vaultPath });
  await run('git', ['remote', 'add', 'origin', 'git@example.invalid:owner/existing.git'], { cwd: vaultPath });
  const before = (await run('git', ['rev-parse', 'HEAD'], { cwd: vaultPath })).stdout.trim();

  const registry = new VaultRegistry(join(root, 'registry.json'));
  await new VaultProvisioner(root, registry, undefined, false).register({ id: 'existing', name: 'Existing', vaultPath, apiKey: 'private-key', restPort: 27124 });

  assert.equal((await run('git', ['rev-parse', 'HEAD'], { cwd: vaultPath })).stdout.trim(), before);
  assert.equal((await run('git', ['branch', '--show-current'], { cwd: vaultPath })).stdout.trim(), 'preserved');
  assert.equal((await run('git', ['remote', 'get-url', 'origin'], { cwd: vaultPath })).stdout.trim(), 'git@example.invalid:owner/existing.git');
  assert.match(await readFile(join(vaultPath, '.gitignore'), 'utf8'), /^custom-rule/m);
});

test('failed GitHub creation rolls back local files and never registers a half-created vault', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-failed-remote-'));
  const registry = new VaultRegistry(join(root, 'registry.json'));
  const calls: string[] = [];
  const dependencies = {
    capabilities: async () => ({ git: true, gh: true, githubAuthenticated: true }),
    configurePlugins: async () => [],
    run: async (command: string, args: string[]) => {
      calls.push(`${command} ${args.join(' ')}`);
      if (command === 'gh' && args[0] === 'repo') throw new Error('simulated repository creation failure');
      return { stdout: '', stderr: '' };
    },
  };
  const provisioner = new VaultProvisioner(root, registry, await createTemplateManager(root, registry), true, dependencies);
  await assert.rejects(provisioner.create({ id: 'failed', name: 'Failed' }), /simulated repository creation failure/);
  await assert.rejects(stat(join(root, 'failed')), /ENOENT/);
  assert.ok(!(await registry.load()).vaults.some((vault) => vault.id === 'failed'));
  assert.ok(!calls.some((call) => /delete/i.test(call)));
});

test('failure after remote creation preserves the remote and local vault but does not register success', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-preserved-remote-'));
  const registry = new VaultRegistry(join(root, 'registry.json'));
  const calls: string[] = [];
  const dependencies = {
    capabilities: async () => ({ git: true, gh: true, githubAuthenticated: true }),
    configurePlugins: async () => [],
    run: async (command: string, args: string[]) => {
      calls.push(`${command} ${args.join(' ')}`);
      if (command === 'gh' && args[0] === 'repo') return { stdout: 'https://github.com/test/preserved\n', stderr: '' };
      if (command === 'gh' && args[0] === 'api') return { stdout: 'test\n', stderr: '' };
      if (command === 'git' && args[0] === 'push') throw new Error('simulated push failure');
      return { stdout: '', stderr: '' };
    },
  };
  const provisioner = new VaultProvisioner(root, registry, await createTemplateManager(root, registry), true, dependencies);
  await assert.rejects(provisioner.create({ id: 'preserved', name: 'Preserved' }), /intentionally been preserved/);
  assert.equal((await stat(join(root, 'preserved'))).isDirectory(), true);
  assert.ok(!(await registry.load()).vaults.some((vault) => vault.id === 'preserved'));
  assert.ok(!calls.some((call) => /delete/i.test(call)));
});

test('new vault initializes and commits real Git while reporting GitHub provisioning unavailable', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vault-local-git-'));
  const registry = new VaultRegistry(join(root, 'registry.json'));
  const dependencies = {
    capabilities: async () => ({ git: true, gh: true, githubAuthenticated: false }),
    configurePlugins: async () => [],
    run: async (command: string, args: string[], cwd?: string) => {
      const result = await runExecutable(command, args, cwd);
      if (command === 'git' && args[0] === 'init') {
        await runExecutable('git', ['config', 'user.email', 'test@example.invalid'], cwd);
        await runExecutable('git', ['config', 'user.name', 'Test'], cwd);
      }
      return result;
    },
  };
  const provisioner = new VaultProvisioner(root, registry, await createTemplateManager(root, registry), true, dependencies);
  const result = await provisioner.create({ id: 'local-git', name: 'Local Git', template: 'default' });
  assert.equal(result.githubProvisioning, 'unavailable');
  assert.equal(result.repositoryUrl, null);
  assert.match((await run('git', ['log', '-1', '--format=%s'], { cwd: join(root, 'local-git') })).stdout.trim(), /Initialize Obsidian vault: Local Git/);
  assert.equal((await run('git', ['ls-files', '.obsidian/plugins/obsidian-local-rest-api/data.json'], { cwd: join(root, 'local-git') })).stdout.trim(), '');
  const key = (await registry.load()).vaults[0].apiKey;
  await assert.rejects(run('git', ['grep', '-F', key], { cwd: join(root, 'local-git') }));
});
