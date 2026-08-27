import { createServer } from 'node:net';

function isAvailable(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, host, () => server.close(() => resolve(true)));
  });
}

export async function allocateRestPort(used: Iterable<number>, requested?: number): Promise<number> {
  const occupied = new Set(used);
  const candidates = requested === undefined ? Array.from({ length: 176 }, (_, index) => 27124 + index) : [requested];
  for (const port of candidates) {
    if (!Number.isInteger(port) || port < 27124 || port > 27299) throw new Error('REST port must be between 27124 and 27299');
    if (!occupied.has(port) && (await isAvailable(port))) return port;
  }
  throw new Error(requested === undefined ? 'No REST API ports are available' : `REST port ${requested} is unavailable`);
}
