import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('loopback HTTP entry point exposes health and stateless Streamable HTTP MCP', async () => {
  const root = await mkdtemp(join(tmpdir(), 'obsidian-http-'));
  const vault = join(root, 'vault');
  const registry = join(root, 'registry.json');
  await mkdir(vault);
  await writeFile(registry, JSON.stringify({ version: 1, nextRestPort: 27125, vaults: [{
    id: 'test', name: 'Test', apiKey: 'fixture-key', host: '127.0.0.1', port: 27124,
    protocol: 'https', vaultPath: vault, imported: true, managed: true,
  }] }));
  process.env.OBSIDIAN_VAULT_REGISTRY = registry;
  process.env.OBSIDIAN_VAULT_ROOT = root;

  const { startHttpServer } = await import('../src/http.js');
  const server = startHttpServer(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    if (server.listening) resolve();
    else server.once('listening', resolve).once('error', reject);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('HTTP test server did not bind');
  const base = `http://127.0.0.1:${address.port}`;
  const client = new Client({ name: 'http-test', version: '1.0.0' });
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json() as { ok: boolean }).ok, true);
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'list_vaults'));
    const wrongMethod = await fetch(`${base}/mcp`);
    assert.equal(wrongMethod.status, 405);
  } finally {
    await client.close().catch(() => undefined);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

