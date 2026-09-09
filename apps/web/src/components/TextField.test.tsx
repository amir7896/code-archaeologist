import { fireEvent, render, screen } from '@testing-library/react';
import { Form, Formik } from 'formik';
import { TextField } from './TextField';

describe('TextField', () => {
  it('shows and hides a password value', () => {
    render(
      <Formik initialValues={{ password: 'secret12' }} onSubmit={() => undefined}>
        <Form>
          <TextField name="password" label="Password" type="password" />
        </Form>
      </Formik>,
    );

    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
    expect(input.value).toBe('secret12');
  });
});
