import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Use at least 2 characters.').max(60),
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.').max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

export const emailSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
})

export const passwordSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.').max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type EmailValues = z.infer<typeof emailSchema>
export type PasswordValues = z.infer<typeof passwordSchema>

export const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  return 'Something went wrong. Please try again.'
}
