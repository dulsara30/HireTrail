import * as yup from 'yup';

export const passwordSchema = yup
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[0-9]/, 'Password must contain at least one number')
  .required('Password is required');

export const registerSchema = yup.object({
  email: yup
    .string()
    .email('Invalid email address')
    .lowercase()
    .trim()
    .max(255, 'Email cannot exceed 255 characters')
    .required('Email is required'),
  password: passwordSchema,
  name: yup
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80, 'Name cannot exceed 80 characters')
    .required('Name is required'),
});

export const loginSchema = yup.object({
  email: yup
    .string()
    .email('Invalid email address')
    .lowercase()
    .trim()
    .required('Email is required'),
  password: yup.string().required('Password is required'),
});

export const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .email('Invalid email address')
    .lowercase()
    .trim()
    .required('Email is required'),
});

export const resetPasswordSchema = yup.object({
  token: yup.string().trim().required('Reset token is required'),
  newPassword: passwordSchema,
});

export const changePasswordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = yup.object({
  token: yup.string().trim().required('Verification token is required'),
});

export const googleStartQuerySchema = yup.object({
  redirect: yup.string().optional().default('/pipeline'),
});

export const googleCallbackQuerySchema = yup.object({
  code: yup.string().required('Authorization code is required'),
  state: yup.string().required('State is required'),
});

export const updateProfileSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(1, 'Name cannot be empty')
    .max(80, 'Name cannot exceed 80 characters')
    .optional(),
  preferences: yup
    .object({
      timezone: yup.string().optional(),
      currency: yup.string().length(3).optional(),
      collapsedLanes: yup.array().of(yup.string().required()).optional(),
      panelWidth: yup.number().min(720).max(1200).optional(),
    })
    .optional(),
});

export const deleteAccountSchema = yup.object({
  password: yup.string().optional(),
  confirmText: yup.string().oneOf(['DELETE']).optional(),
});

export type RegisterInput = yup.InferType<typeof registerSchema>;
export type LoginInput = yup.InferType<typeof loginSchema>;
export type ForgotPasswordInput = yup.InferType<typeof forgotPasswordSchema>;
export type ResetPasswordInput = yup.InferType<typeof resetPasswordSchema>;
export type ChangePasswordInput = yup.InferType<typeof changePasswordSchema>;
export type VerifyEmailInput = yup.InferType<typeof verifyEmailSchema>;
export type UpdateProfileInput = yup.InferType<typeof updateProfileSchema>;
export type DeleteAccountInput = yup.InferType<typeof deleteAccountSchema>;
