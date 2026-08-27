import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { VaultConfig } from '../types.js';

export interface RegistryDocument {
  version: 1;
  nextRestPort: number;
  vaults: VaultConfig[];
}

const EMPTY: RegistryDocument = { version: 1, nextRestPort: 27124, vaults: [] };

export class VaultRegistry {
  constructor(readonly path: string) {}

  async load(): Promise<RegistryDocument> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as RegistryDocument;
      if (parsed.version !== 1 || !Array.isArray(parsed.vaults)) throw new Error('unsupported schema');
      return parsed;
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') return structuredClone(EMPTY);
      throw new Error(`Failed to load vault registry ${this.path}: ${(error as Error).message}`);
    }
  }

  async save(document: RegistryDocument): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, this.path);
  }

  async add(vault: VaultConfig): Promise<RegistryDocument> {
    const document = await this.load();
    if (document.vaults.some((item) => item.id === vault.id)) throw new Error(`Vault ID "${vault.id}" already exists`);
    if (vault.vaultPath && document.vaults.some((item) => item.vaultPath && resolve(item.vaultPath) === resolve(vault.vaultPath!))) {
      throw new Error(`Vault path "${vault.vaultPath}" is already registered`);
    }
    document.vaults.push(vault);
    document.nextRestPort = Math.max(document.nextRestPort, vault.port + 1);
    await this.save(document);
    return document;
  }

  async remove(id: string): Promise<RegistryDocument> {
    const document = await this.load();
    const length = document.vaults.length;
    document.vaults = document.vaults.filter((vault) => vault.id !== id);
    if (document.vaults.length === length) throw new Error(`Vault "${id}" is not registered`);
    await this.save(document);
    return document;
  }
}
