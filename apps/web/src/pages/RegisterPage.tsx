import { Form, Formik } from 'formik';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../lib/errors';
import { useRegisterMutation } from '../queries';
import { errorText, primaryButton } from '../ui';
import { registerSchema, type RegisterValues } from '../validation';

const initialValues: RegisterValues = {
  name: '',
  email: '',
  password: '',
};

export function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const register = useRegisterMutation();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthShell title="Create an account" subtitle="Start a workspace you can share with your team.">
      <Formik
        initialValues={initialValues}
        validationSchema={registerSchema}
        onSubmit={async (values, helpers) => {
          helpers.setStatus(undefined);
          try {
            await register.mutateAsync({
              name: values.name.trim(),
              email: values.email.trim(),
              password: values.password,
            });
            navigate('/', { replace: true });
          } catch (cause) {
            helpers.setStatus(errorMessage(cause, 'Unable to create the account'));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form className="space-y-4" noValidate>
            <TextField name="name" label="Name" autoComplete="name" />
            <TextField name="email" label="Email" type="email" autoComplete="email" />
            <TextField
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              hint="Use at least 8 characters."
            />
            {status ? <p className={errorText}>{status}</p> : null}
            <button className={`${primaryButton} w-full`} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </Form>
        )}
      </Formik>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link className="font-medium text-indigo-600 hover:text-indigo-500" to="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
