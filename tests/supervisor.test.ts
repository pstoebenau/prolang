import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const supervisor = resolve(import.meta.dir, '../scripts/supervise.ts');
function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

for (const mode of ['exit', 'signal'] as const) {
  test(`supervisor cleans stubborn descendants on ${mode}`, async () => {
    const dir = await mkdtemp(resolve(tmpdir(), 'prolang-supervisor-'));
    const marker = resolve(dir, 'pid');
    const leader = resolve(dir, 'leader.ts');
    await writeFile(
      leader,
      `
      Bun.spawn([process.execPath, '-e', ${JSON.stringify(`
        process.on('SIGTERM', () => {});
        await Bun.write(${JSON.stringify(marker)}, String(process.pid));
        setInterval(() => {}, 1000);
      `)}], { stdin: 'ignore', stdout: 'ignore', stderr: 'inherit' });
      ${mode === 'exit' ? 'setTimeout(() => process.exit(0), 700);' : 'setInterval(() => {}, 1000);'}
    `,
    );
    const child = Bun.spawn(
      [process.execPath, supervisor, process.execPath, leader],
      {
        stdout: 'ignore',
        stderr: 'inherit',
      },
    );
    let pid: number | undefined;
    try {
      for (let n = 0; n < 100; n++) {
        try {
          pid = Number(await readFile(marker, 'utf8'));
          break;
        } catch {}
        await Bun.sleep(20);
      }
      expect(pid).toBeGreaterThan(0);
      if (mode === 'signal') child.kill('SIGTERM');
      expect(await child.exited).toBe(1);
      for (let n = 0; n < 100 && alive(pid!); n++) await Bun.sleep(20);
      expect(alive(pid!)).toBe(false);
    } finally {
      child.kill('SIGKILL');
      if (pid && alive(pid)) process.kill(pid, 'SIGKILL');
      await rm(dir, { recursive: true, force: true });
    }
  }, 10000);
}
