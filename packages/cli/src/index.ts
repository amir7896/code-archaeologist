#!/usr/bin/env node
import { APP_NAME, APP_VERSION } from '@code-archaeologist/shared';

const command = process.argv[2];

if (command === '--help' || command === '-h' || !command) {
  process.stdout.write(
    `${APP_NAME} CLI ${APP_VERSION}\n\n` +
      'Commands (later phases): init, analyze, status, ask, impact, hotspots, report, doctor\n',
  );
  process.exit(0);
}

process.stderr.write(`Command "${command}" is not implemented yet.\n`);
process.exit(2);
