import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runFile = promisify(execFile);

async function run(command: string, args: string[], cwd?: string) {
  const safeArgs = command === 'git' && cwd ? ['-c', `safe.directory=${cwd}`, ...args] : args;
  return runFile(command, safeArgs, { cwd, windowsHide: true, encoding: 'utf8' });
}

export async function gitInfo(path: string) {
  try {
    await run('git', ['rev-parse', '--is-inside-work-tree'], path);
  } catch {
    return { enabled: false, dirty: false, branch: null, repository: null, lastCommit: null };
  }
  const [branch, status, remote, lastCommit, divergence] = await Promise.all([
    run('git', ['branch', '--show-current'], path),
    run('git', ['status', '--porcelain'], path),
    run('git', ['remote', 'get-url', 'origin'], path).catch(() => ({ stdout: '' })),
    run('git', ['log', '-1', '--format=%h %cI %s'], path).catch(() => ({ stdout: '' })),
    run('git', ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'], path).catch(() => ({ stdout: '' })),
  ]);
  const [behind, ahead] = divergence.stdout.trim().split(/\s+/).map(Number);
  return {
    enabled: true,
    dirty: status.stdout.trim().length > 0,
    changedFiles: status.stdout.trim() ? status.stdout.trim().split(/\r?\n/) : [],
    branch: branch.stdout.trim() || null,
    repository: remote.stdout.trim() || null,
    lastCommit: lastCommit.stdout.trim() || null,
    ahead: Number.isFinite(ahead) ? ahead : null,
    behind: Number.isFinite(behind) ? behind : null,
  };
}

export async function gitCommit(path: string, message: string) {
  if (!message.trim()) throw new Error('Commit message is required');
  await run('git', ['add', '--all'], path);
  return run('git', ['commit', '-m', message], path);
}

export async function gitHistory(path: string, limit = 10) {
  const count = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const result = await run('git', ['log', `-${count}`, '--format=%h%x09%cI%x09%s'], path);
  return result.stdout.trim().split(/\r?\n/).filter(Boolean);
}

export async function gitSync(path: string) {
  await run('git', ['fetch', '--prune'], path);
  await run('git', ['pull', '--rebase', '--autostash'], path);
  await run('git', ['push'], path);
}

export async function commandCapabilities() {
  const git = await run('git', ['--version']).then(() => true).catch(() => false);
  const gh = await run('gh', ['--version']).then(() => true).catch(() => false);
  const githubAuthenticated = gh && await run('gh', ['auth', 'status']).then(() => true).catch(() => false);
  return { git, gh, githubAuthenticated };
}

export { run as runExecutable };
