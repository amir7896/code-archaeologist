import { matcherFromGitignoreFiles } from '@code-archaeologist/parser';

describe('matcherFromGitignoreFiles', () => {
  it('ignores unanchored directories, globs, and nested rules', () => {
    const ignored = matcherFromGitignoreFiles([
      { path: '.gitignore', content: 'dist\n*.log\n/build\n' },
      { path: 'pkg/.gitignore', content: 'tmp\n!tmp/keep.ts\n' },
    ]);

    expect(ignored('dist/index.js')).toBe(true);
    expect(ignored('packages/app/dist/main.js')).toBe(true);
    expect(ignored('debug.log')).toBe(true);
    expect(ignored('tmp/debug.log')).toBe(true);
    expect(ignored('build/out.js')).toBe(true);
    expect(ignored('src/build/out.js')).toBe(false);
    expect(ignored('pkg/tmp/skip.ts')).toBe(true);
    expect(ignored('pkg/tmp/keep.ts')).toBe(false);
    expect(ignored('tmp/skip.ts')).toBe(false);
    expect(ignored('src/app.ts')).toBe(false);
  });
});
