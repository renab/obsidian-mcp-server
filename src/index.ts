import { ObsidianMCPServer } from './server.js';

async function main(): Promise<void> {
  try {
    console.error('Starting obsidian-mcp-server...');
    const server = new ObsidianMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

void main();
