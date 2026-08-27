import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';

test('one live MCP process addresses all development-registry vaults independently', { skip: !process.env.OBSIDIAN_INTEGRATION_REGISTRY }, async () => {
  const registry = resolve(process.env.OBSIDIAN_INTEGRATION_REGISTRY!);
  const environment = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined));
  environment.OBSIDIAN_VAULT_REGISTRY = registry;
  environment.OBSIDIAN_VAULT_ROOT = resolve('.runtime/vaults');
  environment.OBSIDIAN_API_KEY = 'unused-bootstrap-key';
  const transport = new StdioClientTransport({ command: process.execPath, args: [resolve('dist/index.js')], env: environment });
  const client = new Client({ name: 'multi-vault-integration-test', version: '1.0.0' });
  await client.connect(transport);
  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'create_vault'));
    assert.ok(!tools.tools.some((tool) => /delete.*(repo|remote)|(repo|remote).*delete/i.test(tool.name)));
    const listed = await client.callTool({ name: 'list_vaults', arguments: {} });
    const text = ((listed as { content: { text: string }[] }).content[0]).text;
    assert.doesNotMatch(text, /apiKey|unused-bootstrap-key/);
    const ids = (JSON.parse(text) as { vaults: { id: string }[] }).vaults.map((vault) => vault.id);
    assert.deepEqual(ids, ['sweetwater', 'eve-wormhole-alpha', 'book-project-test']);
    for (const vaultId of ids) {
      const result = await client.callTool({ name: 'pattern_search', arguments: { vaultId, patterns: ['^#'], options: { maxMatches: 1 } } });
      assert.equal(result.isError, undefined, `${vaultId} should route successfully`);
      assert.match(((result as { content: { text: string }[] }).content[0]).text, new RegExp(`"vaultId": "${vaultId}"`));
    }
  } finally {
    await client.close();
  }
});
