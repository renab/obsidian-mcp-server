import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ObsidianMCPServer } from './server.js';

const host = process.env.HOST || '127.0.0.1';
const port = parsePort(process.env.PORT);
const maximumBodyBytes = 2 * 1024 * 1024;

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? 3003);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error('PORT must be an integer between 1 and 65535');
  return parsed;
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const contentLength = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maximumBodyBytes) {
    json(res, 413, { error: 'Request body too large' });
    return;
  }
  const server = new ObsidianMCPServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  try {
    await server.connect(transport, 'stateless Streamable HTTP');
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error('MCP HTTP request failed:', error);
    if (!res.headersSent) json(res, 500, { jsonrpc: '2.0', error: { code: -32603, message: 'Internal MCP server error' }, id: null });
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export const httpServer = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;
  if (req.method === 'GET' && path === '/health') {
    json(res, 200, { ok: true, name: 'obsidian-mcp-server', version: '0.3.0' });
    return;
  }
  if (path === '/mcp' && req.method === 'POST') {
    await handleMcp(req, res);
    return;
  }
  if (path === '/mcp') {
    json(res, 405, { error: 'Method not allowed' }, { allow: 'POST' });
    return;
  }
  json(res, 404, { error: 'Not found' });
});

export function startHttpServer(listenPort = port, listenHost = host) {
  return httpServer.listen(listenPort, listenHost, () => console.log(`Obsidian MCP listening on http://${listenHost}:${listenPort}`));
}

const shutdown = (signal: string) => {
  console.log(`Received ${signal}; shutting down.`);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const isMainModule = process.env.pm_id !== undefined ||
  (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]));
if (isMainModule) startHttpServer();
