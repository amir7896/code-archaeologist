import {
  repositoryCodePath,
  repositoryDnaPath,
  repositoryGraphPath,
  repositoryHistoryPath,
  repositoryAskPath,
  repositoryEvolutionPath,
  repositoryImpactPath,
  workspacePath,
} from './paths';

describe('paths', () => {
  it('keeps product routes short and puts details in the query', () => {
    expect(workspacePath('ws-1')).toBe('/work-space/ws-1');
    expect(repositoryCodePath('ws-1', 'repo-1', { symbol: 'sym-1' })).toBe(
      '/work-space/ws-1/repository/repo-1/code?symbol=sym-1',
    );
    expect(repositoryHistoryPath('ws-1', 'repo-1', { commit: 'abc', path: 'app.py', file: 'app.py' })).toBe(
      '/work-space/ws-1/repository/repo-1/history?commit=abc&path=app.py&file=app.py',
    );
    expect(repositoryGraphPath('ws-1', 'repo-1', { module: 'app', file: 'file-1' })).toBe(
      '/work-space/ws-1/repository/repo-1/graph?module=app&file=file-1',
    );
    expect(repositoryGraphPath('ws-1', 'repo-1', { group: '2', view: 'cycles', depth: '3' })).toBe(
      '/work-space/ws-1/repository/repo-1/graph?group=2&view=cycles&depth=3',
    );
    expect(repositoryDnaPath('ws-1', 'repo-1', { file: 'file-1' })).toBe(
      '/work-space/ws-1/repository/repo-1/dna?file=file-1',
    );
    expect(repositoryImpactPath('ws-1', 'repo-1', { file: 'file-1', depth: '3' })).toBe(
      '/work-space/ws-1/repository/repo-1/impact?file=file-1&depth=3',
    );
    expect(repositoryEvolutionPath('ws-1', 'repo-1', { file: 'file-1' })).toBe(
      '/work-space/ws-1/repository/repo-1/evolution?file=file-1',
    );
    expect(repositoryAskPath('ws-1', 'repo-1', { file: 'file-1' })).toBe(
      '/work-space/ws-1/repository/repo-1/ask?file=file-1',
    );
  });
});
