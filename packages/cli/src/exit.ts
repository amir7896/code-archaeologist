export const EXIT = {
  ok: 0,
  error: 1,
  usage: 2,
  failed: 3,
  auth: 4,
  notFound: 5,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];
