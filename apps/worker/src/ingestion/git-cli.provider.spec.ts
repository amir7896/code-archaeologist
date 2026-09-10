import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GitCliProvider, gitSizeExceedsLimit, parseGitCountObjectsKb } from './git-cli.provider';

const exec = promisify(execFile);

describe('GitCliProvider', () => {
  it('mirrors a repository and lists commit history', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ca-git-'));
    const source = join(root, 'source');
    const mirror = join(root, 'mirror.git');
    await exec('git', ['init', '-b', 'main', source]);
    await exec('git', ['-C', source, 'config', 'user.email', 'ada@example.com']);
    await exec('git', ['-C', source, 'config', 'user.name', 'Ada']);
    await writeFile(join(source, 'readme.md'), 'hello\n');
    await exec('git', ['-C', source, 'add', 'readme.md']);
    await exec('git', ['-C', source, 'commit', '-m', 'Add readme']);
    await writeFile(join(source, 'readme.md'), 'hello world\n');
    await exec('git', ['-C', source, 'add', 'readme.md']);
    await exec('git', ['-C', source, 'commit', '-m', 'Update readme']);

    const git = new GitCliProvider(30_000);
    await git.ensureMirror({ url: source, destination: mirror });
    const branches = await git.listBranches(mirror);
    const head = await git.resolveRevision(mirror, 'main');
    const history = await git.listHistory(mirror, { revision: 'main', maxCount: 20 });

    expect(branches.some((branch) => branch.name === 'main' && branch.isDefault)).toBe(true);
    expect(history.commits).toHaveLength(2);
    expect(history.commits[0].message).toContain('Update readme');
    expect(history.commits.some((commit) => commit.sha === head)).toBe(true);
    expect(history.changes[history.commits[0].sha]?.some((change) => change.newPath === 'readme.md')).toBe(
      true,
    );
    await expect(git.assertMirrorWithinMb(mirror, 1)).resolves.toBeUndefined();
  }, 30_000);

  it('parses git count-objects sizes in KiB', () => {
    expect(parseGitCountObjectsKb('count: 3\nsize: 12\nin-pack: 4\nsize-pack: 2048\n')).toBe(2060);
    expect(gitSizeExceedsLimit(1024, 1)).toBe(false);
    expect(gitSizeExceedsLimit(1025, 1)).toBe(true);
  });
});
