import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

interface MockVault { id: string; apiKey: string; note: string; server: Server; port: number }

async function mockVault(id: string): Promise<MockVault> {
  const state = { note: `# ${id}\n` };
  const apiKey = `key-${id}`;
  const server = createServer((request, response) => {
    if (request.url !== '/' && request.headers.authorization !== `Bearer ${apiKey}`) {
      response.writeHead(401).end('unauthorized');
      return;
    }
    if (request.method === 'GET' && request.url === '/') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ ok: 'OK', service: id, authenticated: true }));
      return;
    }
    if (request.method === 'GET' && request.url === '/vault/') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ files: ['note.md'] }));
      return;
    }
    if (request.method === 'GET' && request.url === '/vault/note.md') {
      response.end(state.note);
      return;
    }
    if (request.method === 'PUT' && request.url === '/vault/note.md') {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => { state.note = Buffer.concat(chunks).toString('utf8'); response.writeHead(204).end(); });
      return;
    }
    if (request.method === 'POST' && request.url?.startsWith('/search/simple/')) {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify([{ filename: 'note.md', score: 1, matches: [{ context: state.note }] }]));
      return;
    }
    response.writeHead(404).end('not found');
  });
  await new Promise<void>((done, reject) => server.once('error', reject).listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Mock server did not allocate a port');
  return { id, apiKey, note: state.note, server, port: address.port };
}

test('one MCP process routes authenticated REST reads, writes, search, and health to three vaults',
  { skip: process.env.OBSIDIAN_REST_INTEGRATION !== '1' }, async () => {
    const mocks = await Promise.all(['sweetwater', 'eve-wormhole-alpha', 'book-project-test'].map(mockVault));
    const root = await mkdtemp(join(tmpdir(), 'obsidian-rest-routing-'));
    const registry = join(root, 'registry.json');
    await writeFile(registry, JSON.stringify({ version: 1, nextRestPort: 27127, vaults: mocks.map((mock) => ({
      id: mock.id, name: mock.id, apiKey: mock.apiKey, host: '127.0.0.1', port: mock.port, protocol: 'http',
      vaultPath: root, managed: true, imported: mock.id === 'sweetwater', lifecycle: 'offline',
    })) }));
    const environment = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
    environment.OBSIDIAN_VAULT_REGISTRY = registry;
    environment.OBSIDIAN_VAULT_ROOT = root;
    const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('dist/index.js')], env: environment });
    const client = new Client({ name: 'rest-routing-integration', version: '1.0.0' });
    await client.connect(transport);
    try {
      const listed = await client.callTool({ name: 'list_vaults', arguments: {} }) as { content: { text: string }[] };
      const summary = JSON.parse(listed.content[0].text) as { vaults: { id: string; connected: boolean; lifecycle: string }[] };
      assert.ok(summary.vaults.every((vault) => vault.connected && vault.lifecycle === 'connected'));
      for (const mock of mocks) {
        const files = await client.callTool({ name: 'list_files_in_vault', arguments: { vaultId: mock.id } }) as { content: { text: string }[] };
        assert.deepEqual(JSON.parse(files.content[0].text), ['note.md']);
        const marker = `# Updated ${mock.id}\n`;
        const written = await client.callTool({ name: 'put_content', arguments: { vaultId: mock.id, filepath: 'note.md', content: marker } });
        assert.equal(written.isError, undefined);
        const read = await client.callTool({ name: 'get_file_contents', arguments: { vaultId: mock.id, filepath: 'note.md' } }) as { content: { text: string }[] };
        assert.equal(read.content[0].text, marker);
        const searched = await client.callTool({ name: 'search', arguments: { vaultId: mock.id, query: 'Updated' } }) as { content: { text: string }[] };
        assert.match(searched.content[0].text, new RegExp(mock.id));
      }
    } finally {
      await client.close();
      await Promise.all(mocks.map((mock) => new Promise<void>((done) => mock.server.close(() => done()))));
    }
  });
