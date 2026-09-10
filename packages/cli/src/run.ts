import { APP_VERSION } from '@code-archaeologist/shared';
import { SDK_COMPATIBILITY, SDK_VERSION } from '@code-archaeologist/sdk';
import { flagBoolean, flagString, parseArgs } from './argv';
import {
  runAnalyze,
  runAsk,
  runDoctor,
  runHotspots,
  runImpact,
  runInit,
  runReport,
  runStatus,
} from './commands';
import { resolveConfig } from './config';
import { createAuthedClient, mapError, type ClientFactory } from './context';
import { EXIT } from './exit';
import { helpText } from './help';
import { usesJson, writeErr, type Io } from './output';

export type RunOptions = {
  argv: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  io?: Io;
  createClient?: ClientFactory;
};

const COMMANDS = {
  init: runInit,
  analyze: runAnalyze,
  status: runStatus,
  ask: runAsk,
  impact: runImpact,
  hotspots: runHotspots,
  report: runReport,
  doctor: runDoctor,
} as const;

export async function runCli(options: RunOptions): Promise<number> {
  const io = options.io ?? { stdout: process.stdout, stderr: process.stderr };
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const parsed = parseArgs(options.argv);
  const json = usesJson({
    json: flagBoolean(parsed.flags, 'json'),
    format: flagString(parsed.flags, 'format'),
  });
  const command = parsed.command;

  if (command === 'version' || flagBoolean(parsed.flags, 'version')) {
    io.stdout.write(
      json
        ? `${JSON.stringify({ ok: true, command: 'version', data: { cli: APP_VERSION, ...SDK_COMPATIBILITY } })}\n`
        : `${APP_VERSION} (sdk ${SDK_VERSION})\n`,
    );
    return EXIT.ok;
  }

  if (!command || command === 'help' || flagBoolean(parsed.flags, 'help')) {
    io.stdout.write(helpText());
    return EXIT.ok;
  }

  const handler = COMMANDS[command as keyof typeof COMMANDS];
  if (!handler) {
    writeErr(io, json, command, 'USAGE', `Unknown command "${command}". See --help.`);
    return EXIT.usage;
  }

  const config = resolveConfig(env, cwd, {
    api: flagString(parsed.flags, 'api'),
    workspace: flagString(parsed.flags, 'workspace'),
    repository: flagString(parsed.flags, 'repository'),
  });

  try {
    const client = createAuthedClient(config, options.createClient);
    return await handler({
      io,
      json: command === 'report' ? json || flagString(parsed.flags, 'format') !== 'text' : json,
      flags: parsed.flags,
      positionals: parsed.positionals,
      config,
      client,
      cwd,
    });
  } catch (error) {
    const mapped = mapError(error);
    writeErr(io, json, command, mapped.code, mapped.message);
    return mapped.exitCode;
  }
}
