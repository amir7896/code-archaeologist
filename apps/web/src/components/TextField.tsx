import { ErrorMessage, Field } from 'formik';
import { useState } from 'react';
import { errorText, fieldClass } from '../ui';

type TextFieldProps = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
};

export function TextField({
  name,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  hint,
}: TextFieldProps) {
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);
  const inputType = isPassword ? (visible ? 'text' : 'password') : type;

  return (
    <div className="block text-sm">
      <label className="font-medium text-zinc-300" htmlFor={name}>
        {label}
      </label>
      <Field name={name}>
        {({ field, meta }: { field: object; meta: { touched: boolean; error?: string } }) => (
          <>
            <div className="relative mt-1.5">
              <input
                {...field}
                id={name}
                className={`${fieldClass(Boolean(meta.touched && meta.error))} ${isPassword ? 'pr-11' : ''}`}
                type={inputType}
                autoComplete={autoComplete}
                placeholder={placeholder}
              />
              {isPassword ? (
                <button
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 hover:text-white"
                  type="button"
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  aria-pressed={visible}
                  onClick={() => setVisible((current) => !current)}
                >
                  {visible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              ) : null}
            </div>
            {hint && !(meta.touched && meta.error) ? (
              <p className="mt-1 text-xs text-zinc-500">{hint}</p>
            ) : null}
          </>
        )}
      </Field>
      <ErrorMessage className={errorText} component="span" name={name} />
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z"
      />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.5 20.25 21M9.88 9.88A3 3 0 0 0 14.12 14.12M6.6 6.62C4.2 8.17 2.25 12 2.25 12s3.75 6.75 9.75 6.75c1.7 0 3.24-.38 4.58-.98M17.4 17.38C19.8 15.83 21.75 12 21.75 12s-3.75-6.75-9.75-6.75c-.86 0-1.68.1-2.45.28"
      />
    </svg>
  );
}
