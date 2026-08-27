import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const recentLaunches = new Map<string, number>();
const cooldownMilliseconds = 15_000;

export interface VaultLaunchResult {
  launched: boolean;
  launchSuppressed: boolean;
  uri: string;
}

export async function openObsidianVault(vaultPath: string): Promise<VaultLaunchResult> {
  const path = resolve(vaultPath);
  if (!(await stat(path).catch(() => null))?.isDirectory()) throw new Error('Registered vault path is not an accessible directory');
  const uri = `obsidian://open?path=${encodeURIComponent(path)}`;
  const previous = recentLaunches.get(path) ?? 0;
  if (Date.now() - previous < cooldownMilliseconds) return { launched: false, launchSuppressed: true, uri };

  const command = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const child = spawn(command, [uri], { detached: true, stdio: 'ignore', windowsHide: true });
  await new Promise<void>((resolvePromise, rejectPromise) => {
    child.once('spawn', resolvePromise);
    child.once('error', rejectPromise);
  });
  child.unref();
  recentLaunches.set(path, Date.now());
  return { launched: true, launchSuppressed: false, uri };
}

export async function waitForEndpoint(probe: () => Promise<boolean>, waitSeconds: number): Promise<boolean> {
  const deadline = Date.now() + Math.max(0, waitSeconds) * 1000;
  do {
    if (await probe()) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  } while (Date.now() < deadline);
  return false;
}
