import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import test from 'node:test';

import { allocateRestPort } from '../src/services/port-allocator.js';

test('allocator skips registry-used and OS-bound ports', async () => {
  const server = createServer();
  let boundPort = 0;
  for (let candidate = 27124; candidate < 27299; candidate += 1) {
    try {
      await new Promise<void>((resolve, reject) => server.once('error', reject).listen(candidate, '127.0.0.1', resolve));
      boundPort = candidate;
      break;
    } catch {
      // A real Obsidian endpoint may already occupy this port during live runs.
    }
  }
  assert.ok(boundPort > 0, 'expected an available port in the allocation range');
  try {
    const used = Array.from({ length: boundPort - 27124 }, (_, index) => 27124 + index);
    const allocated = await allocateRestPort(used);
    assert.ok(allocated > boundPort, 'allocator should skip the OS-bound port');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('allocator validates requested ports and reports exhaustion', async () => {
  await assert.rejects(allocateRestPort([], 27123), /between 27124 and 27299/);
  await assert.rejects(allocateRestPort(Array.from({ length: 176 }, (_, index) => 27124 + index)), /No REST API ports/);
});
