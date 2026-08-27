import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';

export interface VaultTemplate { id: string; description: string; path: string }

const descriptions: Record<string, string> = {
  default: 'General-purpose knowledge vault',
  project: 'Planning and delivery workspace',
  'eve-character': 'EVE Online character, ships, runs, finance, and planning',
  'book-project': 'Research, drafting, continuity, revision, and publishing workspace',
};

export class TemplateManager {
  constructor(readonly root = resolve(process.cwd(), 'templates')) {}

  async list(): Promise<VaultTemplate[]> {
    const entries = await readdir(this.root, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => ({
      id: entry.name, description: descriptions[entry.name] ?? 'Obsidian vault template', path: join(this.root, entry.name),
    }));
  }

  async instantiate(id: string, destination: string, variables: Record<string, string>): Promise<void> {
    const source = resolve(this.root, id);
    if (dirname(source) !== resolve(this.root)) throw new Error('Invalid template ID');
    await stat(source).catch(() => { throw new Error(`Unknown template "${id}"`); });
    await mkdir(destination, { recursive: false });
    await cp(source, destination, { recursive: true, errorOnExist: true });
    await this.substitute(destination, variables);
  }

  private async substitute(root: string, variables: Record<string, string>): Promise<void> {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) await this.substitute(path, variables);
      else if (['.md', '.json', '.txt', '.gitignore'].includes(extname(entry.name)) || basename(entry.name) === '.gitignore') {
        let contents = await readFile(path, 'utf8');
        for (const [key, value] of Object.entries(variables)) contents = contents.replaceAll(`{{${key}}}`, value);
        await writeFile(path, contents, 'utf8');
      }
    }
  }
}
