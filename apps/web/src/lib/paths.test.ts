import { repositoryCodePath, repositoryGraphPath, repositoryHistoryPath, workspacePath } from './paths';

describe('paths', () => {
  it('keeps product routes short and puts details in the query', () => {
    expect(workspacePath('ws-1')).toBe('/work-space/ws-1');
    expect(repositoryCodePath('ws-1', 'repo-1', { symbol: 'sym-1' })).toBe(
      '/work-space/ws-1/repository/repo-1/code?symbol=sym-1',
    );
    expect(repositoryHistoryPath('ws-1', 'repo-1', { commit: 'abc', path: 'app.py' })).toBe(
      '/work-space/ws-1/repository/repo-1/history?commit=abc&path=app.py',
    );
    expect(repositoryGraphPath('ws-1', 'repo-1', { module: 'app', file: 'file-1' })).toBe(
      '/work-space/ws-1/repository/repo-1/graph?module=app&file=file-1',
    );
  });
});
