import { fireEvent, screen } from '@testing-library/react';
import { renderApp } from '../test-utils';
import { useConfirm } from './ConfirmDialog';

function Probe() {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={() => {
        void confirm({
          title: 'Delete workspace',
          message: 'Delete this workspace? This cannot be undone.',
          confirmLabel: 'Delete',
          danger: true,
        });
      }}
    >
      Open
    </button>
  );
}

describe('ConfirmDialog', () => {
  it('opens an in-app modal instead of a browser alert', async () => {
    renderApp(<Probe />);

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('alertdialog', { name: 'Delete workspace' })).toBeTruthy();
    expect(screen.getByText('Delete this workspace? This cannot be undone.')).toBeTruthy();
    expect(screen.queryByText(/localhost/i)).toBeNull();
  });
});
