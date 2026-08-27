import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { TemplateManager } from '../src/services/template-manager.js';
import { VaultRegistry } from '../src/services/vault-registry.js';

export async function createTemplateManager(root: string, registry: VaultRegistry) {
  const templateVault = join(root, 'template-source');
  const definitions = [
    ['Default', 'default', 'Default'],
    ['Book Project', 'book-project', 'Book Project'],
    ['EVE Character', 'eve-character', 'EVE Character'],
  ];
  for (const [folder, id, name] of definitions) {
    const vault = join(templateVault, 'Templates', folder, 'vault');
    await mkdir(vault, { recursive: true });
    await writeFile(join(templateVault, 'Templates', folder, 'template.json'), `${JSON.stringify({
      schemaVersion: 1, id, name, version: '1.0.0', vaultRoot: 'vault', enabled: true,
    }, null, 2)}\n`);
    await writeFile(join(vault, 'Home.md'), '# {{VAULT_NAME}}\nvault_id: {{VAULT_ID}}\n');
    await writeFile(join(vault, '.gitignore'), '.obsidian/plugins/obsidian-local-rest-api/data.json\n');
  }
  await registry.add({ id: 'templates', name: 'Vault Templates', role: 'template-source', apiKey: 'fixture-key',
    host: '127.0.0.1', port: 27199, protocol: 'https', vaultPath: templateVault, imported: true, managed: true });
  return new TemplateManager(registry);
}

