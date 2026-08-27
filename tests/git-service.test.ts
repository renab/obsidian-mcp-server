import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { gitCommit, gitHistory, gitInfo, gitSync } from '../src/services/git-service.js';

const run = promisify(execFile);

async function repository() {
  const path = await mkdtemp(join(tmpdir(), 'git-service-'));
  await run('git', ['init'], { cwd: path });
  await run('git', ['config', 'user.email', 'test@example.invalid'], { cwd: path });
  await run('git', ['config', 'user.name', 'Test'], { cwd: path });
  await writeFile(join(path, 'note.md'), '# One\n');
  await run('git', ['add', '.'], { cwd: path });
  await run('git', ['commit', '-m', 'initial'], { cwd: path });
  return path;
}

test('Git status, commit, and history are vault-scoped', async () => {
  const path = await repository();
  await writeFile(join(path, 'note.md'), '# Two\n');
  assert.equal((await gitInfo(path)).dirty, true);
  await gitCommit(path, 'update note');
  assert.equal((await gitInfo(path)).dirty, false);
  assert.match((await gitHistory(path, 1))[0], /update note/);
});

test('sync failure does not destroy local modifications', async () => {
  const path = await repository();
  await writeFile(join(path, 'note.md'), '# Unsynced\n');
  await assert.rejects(gitSync(path));
  assert.equal(await readFile(join(path, 'note.md'), 'utf8'), '# Unsynced\n');
  assert.equal((await gitInfo(path)).dirty, true);
});
