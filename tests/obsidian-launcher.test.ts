import assert from 'node:assert/strict';
import test from 'node:test';

import { waitForEndpoint } from '../src/services/obsidian-launcher.js';

test('endpoint waiter returns when a launched vault becomes healthy', async () => {
  let probes = 0;
  const connected = await waitForEndpoint(async () => {
    probes += 1;
    return probes === 2;
  }, 1);
  assert.equal(connected, true);
  assert.equal(probes, 2);
});

test('endpoint waiter can return immediately without launching arbitrary paths', async () => {
  assert.equal(await waitForEndpoint(async () => false, 0), false);
});

