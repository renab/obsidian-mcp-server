import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import test from 'node:test';

import { allocateRestPort } from '../src/services/port-allocator.js';

test('allocator skips registry-used and OS-bound ports', async () => {
  const server = createServer();
  await new Promise<void>((resolve, reject) => server.once('error', reject).listen(27125, '127.0.0.1', resolve));
  try {
    assert.equal(await allocateRestPort([27124]), 27126);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('allocator validates requested ports and reports exhaustion', async () => {
  await assert.rejects(allocateRestPort([], 27123), /between 27124 and 27299/);
  await assert.rejects(allocateRestPort(Array.from({ length: 176 }, (_, index) => 27124 + index)), /No REST API ports/);
});
