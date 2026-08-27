import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { commandCapabilities, runExecutable } from './git-service.js';

const REQUIRED = [
  { id: 'obsidian-git', repository: 'Vinzent03/obsidian-git' },
  { id: 'obsidian-local-rest-api', repository: 'coddingtonbear/obsidian-local-rest-api' },
] as const;

export interface PluginInstallResult { id: string; installed: boolean; alreadyPresent?: boolean; error?: string }

export async function installRequiredPlugins(vaultPath: string): Promise<PluginInstallResult[]> {
  const capabilities = await commandCapabilities();
  const results: PluginInstallResult[] = [];
  for (const plugin of REQUIRED) {
    const destination = join(vaultPath, '.obsidian', 'plugins', plugin.id);
    await mkdir(destination, { recursive: true });
    try {
      await Promise.all([access(join(destination, 'main.js')), access(join(destination, 'manifest.json'))]);
      results.push({ id: plugin.id, installed: true, alreadyPresent: true });
      continue;
    } catch {
      // Download only missing plugin assets; existing installations are never overwritten.
    }
    if (!capabilities.gh) {
      results.push({ id: plugin.id, installed: false, error: 'GitHub CLI unavailable' });
      continue;
    }
    try {
      await runExecutable('gh', ['release', 'download', '--repo', plugin.repository, '--pattern', 'main.js',
        '--pattern', 'manifest.json', '--pattern', 'styles.css', '--dir', destination, '--clobber']);
      await Promise.all([access(join(destination, 'main.js')), access(join(destination, 'manifest.json'))]);
      results.push({ id: plugin.id, installed: true });
    } catch (error) {
      results.push({ id: plugin.id, installed: false, error: (error as Error).message });
    }
  }
  return results;
}

export async function configureRequiredPlugins(vaultPath: string, apiKey: string, port: number) {
  const plugins = await installRequiredPlugins(vaultPath);
  const communityPath = join(vaultPath, '.obsidian', 'community-plugins.json');
  const community: string[] = await readFile(communityPath, 'utf8')
    .then((value) => JSON.parse(value) as string[])
    .catch((): string[] => []);
  let communityChanged = false;
  for (const { id } of REQUIRED) {
    if (!community.includes(id)) { community.push(id); communityChanged = true; }
  }
  if (communityChanged) await writeFile(communityPath, `${JSON.stringify(community, null, 2)}\n`, 'utf8');
  const restData = join(vaultPath, '.obsidian', 'plugins', 'obsidian-local-rest-api', 'data.json');
  try {
    await access(restData);
  } catch {
    await writeFile(restData, `${JSON.stringify({ port, apiKey, enableInsecureServer: false }, null, 2)}\n`, { mode: 0o600 });
  }
  return plugins;
}
