import { randomBytes } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

import { commandCapabilities, gitInfo, runExecutable } from './git-service.js';
import { configureRequiredPlugins, type PluginInstallResult } from './plugin-installer.js';
import { allocateRestPort } from './port-allocator.js';
import { TemplateManager } from './template-manager.js';
import { VaultRegistry } from './vault-registry.js';

import type { VaultConfig } from '../types.js';

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REPOSITORY = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$/;

function validateDisplayName(name: string) {
  if (!name?.trim()) throw new Error('Vault display name is required');
  if (name.length > 100 || /[\0\r\n]/.test(name)) throw new Error('Vault display name contains unsafe characters or is too long');
}

export interface CreateVaultInput {
  id: string; name: string; template?: string; githubRepoName?: string; description?: string;
  restPort?: number; gitEnabled?: boolean; openInObsidian?: boolean; templateVariables?: Record<string, string>;
}

interface ProvisionerDependencies {
  capabilities: typeof commandCapabilities;
  run: typeof runExecutable;
  configurePlugins: typeof configureRequiredPlugins;
}

const defaultDependencies: ProvisionerDependencies = {
  capabilities: commandCapabilities,
  run: runExecutable,
  configurePlugins: configureRequiredPlugins,
};

export class VaultProvisioner {
  constructor(readonly vaultRoot: string, readonly registry: VaultRegistry, readonly templates?: TemplateManager,
    readonly installPlugins = true, readonly dependencies: ProvisionerDependencies = defaultDependencies) {}

  private target(id: string) {
    if (!ID.test(id)) throw new Error('Vault ID must be lowercase letters, numbers, and single hyphens');
    const path = resolve(this.vaultRoot, id);
    if (dirname(path) !== resolve(this.vaultRoot)) throw new Error('Vault path escapes OBSIDIAN_VAULT_ROOT');
    return path;
  }

  async create(input: CreateVaultInput) {
    validateDisplayName(input.name);
    const path = this.target(input.id);
    await access(path).then(() => { throw new Error(`Vault directory already exists: ${path}`); }).catch((error) => {
      if ((error as { code?: string }).code !== 'ENOENT') throw error;
    });
    const document = await this.registry.load();
    if (document.vaults.some((vault) => vault.id === input.id)) throw new Error(`Vault ID "${input.id}" already exists`);
    const port = await allocateRestPort(document.vaults.map((vault) => vault.port), input.restPort);
    const template = input.template ?? 'default';
    const repositoryName = input.githubRepoName ?? `obsidian-${input.id}`;
    if (!REPOSITORY.test(repositoryName) || repositoryName.includes('..')) throw new Error('Unsafe GitHub repository name');
    const apiKey = randomBytes(32).toString('hex');
    let remoteCreated = false;
    let repository: string | undefined;
    let githubProvisioning: 'created' | 'unavailable' | 'disabled' = input.gitEnabled === false ? 'disabled' : 'unavailable';
    let plugins: PluginInstallResult[] = [];
    try {
      await mkdir(this.vaultRoot, { recursive: true });
      if (!this.templates) throw new Error('A registered Templates vault is required to create a vault');
      const instantiatedTemplate = await this.templates.instantiate(template, path, {
        VAULT_ID: input.id, VAULT_NAME: input.name, CREATED_DATE: new Date().toISOString(),
        GITHUB_REPOSITORY: repositoryName, REST_API_PORT: String(port),
        ...(input.templateVariables ?? {}),
      });
      await writeFile(resolve(path, '.mcp-vault.json'), `${JSON.stringify({
        schemaVersion: 1, vaultId: input.id, displayName: input.name,
        template: { id: instantiatedTemplate.id, version: instantiatedTemplate.version },
        managedBy: 'obsidian-mcp-server', createdAt: new Date().toISOString(), imported: false, description: input.description,
      }, null, 2)}\n`);
      if (this.installPlugins) plugins = await this.dependencies.configurePlugins(path, apiKey, port);
      if (input.gitEnabled !== false) {
        const capabilities = await this.dependencies.capabilities();
        if (!capabilities.git) throw new Error('Git is unavailable');
        await this.dependencies.run('git', ['init'], path);
        await this.dependencies.run('git', ['add', '--all'], path);
        await this.dependencies.run('git', ['commit', '-m', `Initialize Obsidian vault: ${input.name}`], path);
        if (capabilities.githubAuthenticated) {
          const repositoryArgs = ['repo', 'create', repositoryName, '--private'];
          if (input.description) repositoryArgs.push('--description', input.description);
          const created = await this.dependencies.run('gh', repositoryArgs);
          remoteCreated = true;
          githubProvisioning = 'created';
          repository = created.stdout.trim().split(/\r?\n/).find((line) => line.startsWith('http'));
          const account = await this.dependencies.run('gh', ['api', 'user', '--jq', '.login']);
          const sshRemote = `git@github.com:${account.stdout.trim()}/${repositoryName}.git`;
          await this.dependencies.run('git', ['remote', 'add', 'origin', sshRemote], path);
          await this.dependencies.run('git', ['push', '-u', 'origin', 'HEAD'], path);
        }
      }
      const vault: VaultConfig = { id: input.id, name: input.name, apiKey, host: '127.0.0.1', port,
        protocol: 'https', vaultPath: path, repository,
        template: { id: instantiatedTemplate.id, version: instantiatedTemplate.version }, createdAt: new Date().toISOString(),
        imported: false, managed: true, gitEnabled: input.gitEnabled !== false, lifecycle: 'offline' };
      await this.registry.add(vault);
      let openedInObsidian = false;
      let openError: string | undefined;
      if (input.openInObsidian) {
        const uri = `obsidian://open?path=${encodeURIComponent(path)}`;
        const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        try { await this.dependencies.run(command, [uri]); openedInObsidian = true; }
        catch (error) { openError = (error as Error).message; }
      }
      return { vaultId: input.id, vaultPath: path, restPort: port, repositoryName, repositoryUrl: repository ?? null,
        gitInitialized: input.gitEnabled !== false, template: { id: instantiatedTemplate.id, version: instantiatedTemplate.version }, registryStatus: 'registered', lifecycle: 'offline',
        obsidianInitializationRequired: true, githubRepositoryCreated: remoteCreated, plugins,
        pluginInstallationRequired: !this.installPlugins || plugins.some((plugin) => !plugin.installed),
        githubProvisioning, openedInObsidian, openError };
    } catch (error) {
      if (!remoteCreated) await rm(path, { recursive: true, force: true }).catch(() => undefined);
      throw new Error(`${(error as Error).message}${remoteCreated ? '; remote repository was created and has intentionally been preserved' : ''}`);
    }
  }

  async register(input: { id: string; name: string; vaultPath: string; apiKey: string; restPort: number; repository?: string; role?: string }) {
    if (!ID.test(input.id)) throw new Error('Invalid vault ID');
    validateDisplayName(input.name);
    if (!input.apiKey?.trim()) throw new Error('Local REST API key is required');
    if (!Number.isInteger(input.restPort) || input.restPort < 27124 || input.restPort > 27299) throw new Error('REST port must be between 27124 and 27299');
    const path = resolve(input.vaultPath);
    const root = resolve(this.vaultRoot);
    const pathFromRoot = relative(root, path);
    if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) throw new Error('Vault path escapes OBSIDIAN_VAULT_ROOT');
    await access(path);
    const document = await this.registry.load();
    if (document.vaults.some((vault) => vault.id === input.id)) throw new Error(`Vault ID "${input.id}" already exists`);
    if (document.vaults.some((vault) => vault.vaultPath && resolve(vault.vaultPath) === path)) throw new Error(`Vault path "${path}" is already registered`);
    if (document.vaults.some((vault) => vault.port === input.restPort)) throw new Error(`REST port ${input.restPort} is already assigned`);
    const git = await gitInfo(path);
    const existingIgnore = resolve(path, '.gitignore');
    let ignore = await readFile(existingIgnore, 'utf8').catch(() => '');
    for (const rule of ['.obsidian/plugins/obsidian-local-rest-api/data.json', '.obsidian/workspace.json', '.obsidian/workspace-mobile.json']) {
      if (!ignore.split(/\r?\n/).includes(rule)) ignore += `${ignore && !ignore.endsWith('\n') ? '\n' : ''}${rule}\n`;
    }
    await writeFile(existingIgnore, ignore, 'utf8');
    if (this.installPlugins) await this.dependencies.configurePlugins(path, input.apiKey, input.restPort);
    const vault: VaultConfig = { id: input.id, name: input.name, apiKey: input.apiKey, host: '127.0.0.1',
      port: input.restPort, protocol: 'https', vaultPath: path, repository: input.repository ?? git.repository ?? undefined,
      template: null, role: input.role, imported: true, managed: true, gitEnabled: git.enabled, lifecycle: 'offline' };
    await writeFile(resolve(path, '.mcp-vault.json'), `${JSON.stringify({ schemaVersion: 1, vaultId: input.id,
      displayName: input.name, template: null, role: input.role, managedBy: 'obsidian-mcp-server', imported: true }, null, 2)}\n`);
    await this.registry.add(vault);
    return { vaultId: input.id, vaultPath: path, imported: true, git };
  }
}
