require('./load-db-env.cjs');

const { spawnSync } = require('node:child_process');

const result = spawnSync('prisma', process.argv.slice(2), {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});

process.exit(result.status ?? 1);
