import { Form, Formik } from 'formik';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../lib/errors';
import { useLoginMutation } from '../queries';
import { errorText, primaryButton } from '../ui';
import { loginSchema, type LoginValues } from '../validation';

const initialValues: LoginValues = {
  email: '',
  password: '',
};

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const login = useLoginMutation();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthShell title="Sign in" subtitle="Enter your email and password.">
      <Formik
        initialValues={initialValues}
        validationSchema={loginSchema}
        onSubmit={async (values, helpers) => {
          helpers.setStatus(undefined);
          try {
            await login.mutateAsync({
              email: values.email.trim(),
              password: values.password,
            });
            navigate('/', { replace: true });
          } catch (cause) {
            helpers.setStatus(errorMessage(cause, 'Unable to sign in'));
          }
        }}
      >
        {({ isSubmitting, status }) => (
          <Form className="space-y-4" noValidate>
            <TextField name="email" label="Email" type="email" autoComplete="email" />
            <TextField
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
            {status ? <p className={errorText}>{status}</p> : null}
            <button className={`${primaryButton} w-full`} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </Form>
        )}
      </Formik>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Don't have an account?{' '}
        <Link className="font-medium text-indigo-600 hover:text-indigo-500" to="/register">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
