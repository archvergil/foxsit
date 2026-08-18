import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'

import { ConfigurationNotice } from '@/components/feedback/ConfigurationNotice'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { productCopy } from '@/config/product'
import { AuthLayout } from './AuthLayout'
import { getAuthErrorMessage, signUpSchema, type SignUpValues } from './authSchemas'
import { useAuth } from './authContext'

export default function SignupPage() {
  const { signUp, status } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) })

  if (status === 'authenticated') return <Navigate to="/today" replace />

  const onSubmit = async (values: SignUpValues) => {
    setFormError(null)
    try {
      const hasSession = await signUp(values.email, values.password, values.displayName)
      if (hasSession) void navigate('/today', { replace: true })
      else setConfirmationEmail(values.email)
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
    }
  }

  return (
    <AuthLayout
      title={productCopy.auth.signUpTitle}
      subtitle={productCopy.auth.signUpSubtitle}
      alternate={{ label: 'Already have an account?', action: 'Sign in', to: '/login' }}
    >
      {confirmationEmail ? (
        <div className="auth-success" role="status">
          <MailCheck aria-hidden />
          <h2>Check your inbox</h2>
          <p>We sent a confirmation link to {confirmationEmail}.</p>
        </div>
      ) : (
        <>
          {status === 'configuration-missing' ? <ConfigurationNotice /> : null}
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              label="Name"
              autoComplete="name"
              error={errors.displayName?.message}
              {...register('displayName')}
            />
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />
            <TextField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={status === 'configuration-missing' || status === 'loading'}
            >
              Create account
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
