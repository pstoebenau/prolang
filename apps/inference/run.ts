import { resolve } from 'node:path';
import { supervise } from '../../scripts/supervise';

// Resolve from this file so workspace scripts work from any calling directory.
const root = resolve(import.meta.dir, '../..');
const python = process.env.PYTHON || resolve(root, '.venv/bin/python');
const command = process.argv[2];
const args =
  command === 'check'
    ? [
        '-m',
        'py_compile',
        resolve(import.meta.dir, 'app.py'),
        resolve(import.meta.dir, 'qwen_transcription.py'),
        resolve(import.meta.dir, 'phone_timing.py'),
      ]
    : command === 'start'
      ? [
          '-m',
          'uvicorn',
          'apps.inference.app:app',
          '--host',
          '127.0.0.1',
          '--port',
          '8001',
        ]
      : null;
if (!args) throw new Error('Expected start or check');
process.chdir(root);
if (command === 'check') {
  process.execve(Bun.which(python) || python, [python, ...args], process.env);
} else {
  // Turbo may see Uvicorn exit before its worker does. Always reap the entire group.
  supervise([[python, ...args]], root, process.env, 1);
}
