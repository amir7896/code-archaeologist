import { Form, Formik } from 'formik';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../lib/errors';
import { homePath } from '../lib/paths';
import { useLoginMutation } from '../queries';
import { errorText, primaryButton, secondaryButton } from '../ui';
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
    return <Navigate to={homePath} replace />;
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your workspace.">
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
            navigate(homePath, { replace: true });
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
            <div className="flex items-center gap-3 pt-1 text-xs uppercase tracking-[0.18em] text-zinc-600">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>
            <button className={`${secondaryButton} w-full`} type="button" disabled>
              Continue with GitHub
            </button>
            <p className="text-center text-xs leading-5 text-zinc-500">
              Available when GitHub is connected. Protected by session and refresh-token rotation.
            </p>
          </Form>
        )}
      </Formik>
    </AuthShell>
  );
}
