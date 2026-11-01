// Keep every child's descendants in a group we can terminate after its leader exits.
export function supervise(
  commands: string[][],
  cwd: string,
  env = process.env,
  signalExitCode = 0,
) {
  const children: Bun.Subprocess[] = [];
  let stopping = false;
  function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    for (const c of children) {
      try {
        process.kill(-c.pid, 'SIGTERM');
      } catch {
        c.kill();
      }
    }
    setTimeout(() => {
      for (const c of children) {
        try {
          process.kill(-c.pid, 'SIGKILL');
        } catch {}
      }
      process.exit(code);
    }, 1500);
  }
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.on(signal, () => stop(signalExitCode));
  for (const cmd of commands) {
    try {
      const child = Bun.spawn(cmd, {
        cwd,
        env,
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit',
        detached: true,
      });
      children.push(child);
      child.exited.then((code) => stop(code || 1));
    } catch (error) {
      console.error(error);
      stop(1);
      break;
    }
  }
}

if (import.meta.main) {
  supervise([process.argv.slice(2)], process.cwd(), process.env, 1);
}
