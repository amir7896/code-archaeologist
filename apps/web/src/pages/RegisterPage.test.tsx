import { fireEvent, screen } from '@testing-library/react';
import { renderApp } from '../test-utils';
import { RegisterPage } from './RegisterPage';

describe('RegisterPage', () => {
  it('shows Formik field errors instead of the browser tooltip', async () => {
    renderApp(<RegisterPage />, { route: '/register' });

    fireEvent.submit(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Name is required')).toBeTruthy();
    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
  });

  it('toggles password visibility from the eye button', () => {
    renderApp(<RegisterPage />, { route: '/register' });

    const password = document.getElementById('password') as HTMLInputElement;
    expect(password.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password.type).toBe('password');
  });
});
