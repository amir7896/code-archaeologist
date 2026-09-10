import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { BackButton } from './BackButton';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe('BackButton', () => {
  beforeEach(() => {
    navigate.mockReset();
  });

  it('goes to the previous history entry when one exists', () => {
    window.history.replaceState({ idx: 2 }, '', '/current');
    render(
      <MemoryRouter>
        <BackButton fallback="/fallback" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('uses the fallback when there is no previous route', () => {
    window.history.replaceState({ idx: 0 }, '', '/current');
    render(
      <MemoryRouter>
        <BackButton fallback="/fallback" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(navigate).toHaveBeenCalledWith('/fallback');
  });
});
