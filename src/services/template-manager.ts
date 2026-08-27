import { cp, lstat, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';

import { VaultRegistry } from './vault-registry.js';

export interface TemplateManifest {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  tags?: string[];
  requiredVariables?: string[];
  vaultRoot: string;
  enabled: boolean;
}

export interface VaultTemplate extends TemplateManifest {
  path: string;
  manifestPath: string;
  files: number;
}

export interface TemplateValidation {
  directory: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  template?: VaultTemplate;
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const SECRET_FILE = /(?:obsidian-local-rest-api[\\/]data\.json|id_rsa|id_ed25519|\.pem$)/i;
const SECRET_CONTENT = /(?:github[_-]?token|private[_-]?key|rest[_-]?api[_-]?key)\s*["'=:\s]+(?!\{\{)[A-Za-z0-9_\-/+=]{12,}/i;

export class TemplateManager {
  constructor(readonly registry: VaultRegistry) {}

  private async templatesRoot(): Promise<string> {
    const document = await this.registry.load();
    const source = document.vaults.find((vault) => vault.role === 'template-source') ?? document.vaults.find((vault) => vault.id === 'templates');
    if (!source?.vaultPath) throw new Error('A registered Templates vault with role "template-source" is required');
    return resolve(source.vaultPath, 'Templates');
  }

  private async fileCount(root: string): Promise<number> {
    let count = 0;
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory()) count += await this.fileCount(join(root, entry.name));
      else if (entry.isFile()) count += 1;
    }
    return count;
  }

  async validateDirectory(directory: string): Promise<TemplateValidation> {
    const root = await this.templatesRoot();
    const candidate = resolve(root, directory);
    const fromRoot = relative(root, candidate);
    const result: TemplateValidation = { directory, valid: false, errors: [], warnings: [] };
    if (!fromRoot || fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
      result.errors.push('Template directory escapes the Templates vault');
      return result;
    }
    const manifestPath = join(candidate, 'template.json');
    let manifest: TemplateManifest;
    try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as TemplateManifest; }
    catch (error) { result.errors.push(`Invalid or missing template.json: ${(error as Error).message}`); return result; }
    if (manifest.schemaVersion !== 1) result.errors.push('schemaVersion must be 1');
    if (!ID.test(manifest.id ?? '')) result.errors.push('id must use lowercase letters, numbers, and single hyphens');
    if (!manifest.name?.trim()) result.errors.push('name is required');
    if (!VERSION.test(manifest.version ?? '')) result.errors.push('version must be semantic version syntax');
    if (typeof manifest.enabled !== 'boolean') result.errors.push('enabled must be boolean');
    if (!manifest.vaultRoot || isAbsolute(manifest.vaultRoot) || relative('.', manifest.vaultRoot).startsWith('..')) result.errors.push('vaultRoot must be a safe relative path');
    const vaultPath = resolve(candidate, manifest.vaultRoot || 'vault');
    if (relative(candidate, vaultPath).startsWith('..')) result.errors.push('vaultRoot escapes the template directory');
    else if (!(await stat(vaultPath).catch(() => null))?.isDirectory()) result.errors.push('declared vaultRoot directory does not exist');
    const inspect = async (path: string): Promise<void> => {
      for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
        const child = join(path, entry.name);
        if (entry.name === '.git') result.errors.push(`nested .git is forbidden: ${relative(candidate, child)}`);
        else if ((await lstat(child)).isSymbolicLink()) result.errors.push(`symbolic links are unsupported: ${relative(candidate, child)}`);
        else if (entry.isDirectory()) await inspect(child);
        else if (SECRET_FILE.test(relative(candidate, child))) result.errors.push(`secret-bearing file is forbidden: ${relative(candidate, child)}`);
        else if (entry.isFile() && ['.md', '.json', '.txt', ''].includes(extname(entry.name))) {
          const content = await readFile(child, 'utf8').catch(() => '');
          if (SECRET_CONTENT.test(content)) result.errors.push(`possible embedded secret in ${relative(candidate, child)}`);
        }
      }
    };
    await inspect(candidate);
    if (!result.errors.length) result.template = { ...manifest, path: vaultPath, manifestPath, files: await this.fileCount(vaultPath) };
    result.valid = result.errors.length === 0;
    return result;
  }

  async refresh(): Promise<{ templates: VaultTemplate[]; invalid: TemplateValidation[] }> {
    const root = await this.templatesRoot();
    const entries = await readdir(root, { withFileTypes: true }).catch((error) => { throw new Error(`Cannot read Templates vault: ${(error as Error).message}`); });
    const validations = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => this.validateDirectory(entry.name)));
    const templates = validations.filter((item) => item.valid && item.template?.enabled).map((item) => item.template!);
    const duplicateIds = templates.filter((template, index) => templates.findIndex((item) => item.id === template.id) !== index).map((item) => item.id);
    if (duplicateIds.length) throw new Error(`Duplicate template IDs: ${[...new Set(duplicateIds)].join(', ')}`);
    return { templates: templates.sort((a, b) => a.id.localeCompare(b.id)), invalid: validations.filter((item) => !item.valid) };
  }

  async list(): Promise<VaultTemplate[]> { return (await this.refresh()).templates; }

  async get(id: string): Promise<VaultTemplate> {
    const template = (await this.list()).find((item) => item.id === id);
    if (!template) throw new Error(`Unknown or disabled template "${id}"`);
    return template;
  }

  async validate(id: string): Promise<TemplateValidation> {
    const root = await this.templatesRoot();
    for (const entry of (await readdir(root, { withFileTypes: true })).filter((item) => item.isDirectory())) {
      const validation = await this.validateDirectory(entry.name);
      let manifestId: string | undefined;
      try { manifestId = (JSON.parse(await readFile(join(root, entry.name, 'template.json'), 'utf8')) as TemplateManifest).id; } catch { /* validation contains the error */ }
      if (manifestId === id || entry.name === id) return validation;
    }
    throw new Error(`Template "${id}" was not found`);
  }

  async instantiate(id: string, destination: string, variables: Record<string, string>): Promise<VaultTemplate> {
    const template = await this.get(id);
    for (const required of template.requiredVariables ?? []) if (!variables[required]) throw new Error(`Template variable ${required} is required`);
    await mkdir(destination, { recursive: false });
    await cp(template.path, destination, { recursive: true, errorOnExist: true });
    await this.substitute(destination, variables);
    return template;
  }

  private async substitute(root: string, variables: Record<string, string>): Promise<void> {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) await this.substitute(path, variables);
      else if (['.md', '.json', '.txt'].includes(extname(entry.name)) || basename(entry.name) === '.gitignore') {
        let contents = await readFile(path, 'utf8');
        for (const [key, value] of Object.entries(variables)) contents = contents.replaceAll(`{{${key}}}`, value);
        await writeFile(path, contents, 'utf8');
      }
    }
  }
}
