import { supervise } from './supervise';
import { resolve } from 'node:path';
const root = resolve(import.meta.dir, '..');
process.chdir(root);
const production = process.argv[2] === 'start';
// Loose mode deliberately propagates Python, model/cache and web runtime settings.
const commands = production
  ? [
      ['bun', 'run', '--cwd', 'apps/inference', 'start'],
      ['bun', 'run', '--cwd', 'apps/web', 'start'],
    ]
  : [
      [
        'bun',
        'x',
        '--no-install',
        'turbo',
        'dev',
        '--env-mode=loose',
        '--ui=stream',
      ],
    ];
supervise(commands, root, {
  ...process.env,
  DATABASE_PATH:
    process.env.DATABASE_PATH || resolve(root, 'data/prolang.sqlite'),
  HOST: '0.0.0.0',
  BODY_SIZE_LIMIT: '26214400',
  PORT: process.env.PORT || '3000',
});
