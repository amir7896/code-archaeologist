import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { AskPage } from './AskPage';

vi.mock('../queries', () => ({
  useWorkspaceQuery: () => ({ data: { role: 'OWNER' } }),
  useAiStatusQuery: () => ({ data: { available: false } }),
  useInvestigationsQuery: () => ({
    data: {
      items: [{ id: 'ask-1', question: 'Can you tell me about this repository?', status: 'SUCCEEDED' }],
    },
    isLoading: false,
  }),
  useInvestigationQuery: (_ws: string, _repo: string, id: string) => ({
    data:
      id === 'ask-1'
        ? {
            id: 'ask-1',
            question: 'Can you tell me about this repository?',
            status: 'SUCCEEDED',
            usedModel: false,
            confidence: 0.78,
            confidenceLabel: 'likely',
            messages: [{ role: 'assistant', content: 'Indexed repository facts say this is a Python backend.' }],
            evidence: [
              {
                id: 'e1',
                sourceType: 'COMMIT',
                citation: '1f2a3d6',
                excerpt: 'Project routes allocation · 2026-09-04',
                commitSha: '1f2a3d6aaaaaaa',
                path: null,
                fileId: null,
                symbolId: null,
              },
              {
                id: 'e2',
                sourceType: 'FILE',
                citation: 'README.md',
                excerpt: 'README.md',
                commitSha: null,
                path: 'README.md',
                fileId: 'file-1',
                symbolId: null,
              },
            ],
          }
        : undefined,
    isLoading: false,
    isError: false,
  }),
  useCreateInvestigationMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

function renderAsk(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/work-space/ws-1/repository/repo-1/ask${search}`]}>
      <Routes>
        <Route path="/work-space/:workspaceId/repository/:repositoryId/ask" element={<AskPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AskPage', () => {
  it('uses the PDF question bar and keeps earlier questions', () => {
    renderAsk();
    expect(screen.getByRole('heading', { name: 'Investigation' })).toBeTruthy();
    expect(screen.getByText('Ask questions about your codebase, get insights, and cited answers.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Earlier questions' })).toBeTruthy();
    expect(screen.getByPlaceholderText('Ask a question about your codebase...')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ask' })).toBeTruthy();
  });

  it('renders the asked question and related evidence chips', () => {
    renderAsk('?ask=ask-1');
    expect(screen.getByText('You asked')).toBeTruthy();
    expect(screen.getAllByText('Can you tell me about this repository?').length).toBeGreaterThan(0);
    expect(screen.getByText('Indexed evidence')).toBeTruthy();
    expect(screen.getByText('Indexed repository facts say this is a Python backend.')).toBeTruthy();
    expect(screen.getByText('Commit 1f2a3d6 (2026-09-04)')).toBeTruthy();
    expect(screen.getByText('Files: README.md')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'Who added payments here?' } });
    expect((screen.getByLabelText('Question') as HTMLInputElement).value).toBe('Who added payments here?');
  });
});
