#!/usr/bin/env node
import { runCli } from './run';

void runCli({ argv: process.argv.slice(2) }).then((code) => {
  process.exitCode = code;
});
