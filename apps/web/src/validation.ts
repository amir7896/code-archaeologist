import * as Yup from 'yup';

export const loginSchema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

export const registerSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('Name is required')
    .max(80, 'Name must be at most 80 characters'),
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const workspaceNameSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('Workspace name is required')
    .max(80, 'Name must be at most 80 characters'),
});

export const inviteMemberSchema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  role: Yup.string()
    .oneOf(['ADMIN', 'ANALYST', 'VIEWER'], 'Choose a valid role')
    .required('Role is required'),
});

export type LoginValues = Yup.InferType<typeof loginSchema>;
export type RegisterValues = Yup.InferType<typeof registerSchema>;
export type WorkspaceNameValues = Yup.InferType<typeof workspaceNameSchema>;
export const createRepositorySchema = Yup.object({
  url: Yup.string()
    .trim()
    .required('Repository URL is required')
    .matches(/^https:\/\//i, 'Use an HTTPS Git URL')
    .max(500, 'URL must be at most 500 characters'),
  name: Yup.string().trim().max(80, 'Name must be at most 80 characters'),
  defaultBranch: Yup.string().trim().max(120, 'Branch must be at most 120 characters'),
  token: Yup.string().trim().max(4096, 'Token is too long'),
  includePullRequests: Yup.boolean(),
  respectGitignore: Yup.boolean(),
});

export const repositorySettingsSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('Name is required')
    .max(80, 'Name must be at most 80 characters'),
  defaultBranch: Yup.string().trim().max(120, 'Branch must be at most 120 characters'),
  token: Yup.string().trim().max(4096, 'Token is too long'),
});

export type InviteMemberValues = Yup.InferType<typeof inviteMemberSchema>;
export type CreateRepositoryValues = Yup.InferType<typeof createRepositorySchema>;
export type RepositorySettingsValues = Yup.InferType<typeof repositorySettingsSchema>;
