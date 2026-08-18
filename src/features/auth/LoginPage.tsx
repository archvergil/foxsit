import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { ConfigurationNotice } from '@/components/feedback/ConfigurationNotice'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { productCopy } from '@/config/product'
import { AuthLayout } from './AuthLayout'
import { getAuthErrorMessage, signInSchema, type SignInValues } from './authSchemas'
import { useAuth } from './authContext'

export default function LoginPage() {
  const { signIn, status } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) })

  if (status === 'authenticated') return <Navigate to="/today" replace />

  const onSubmit = async (values: SignInValues) => {
    setFormError(null)
    try {
      await signIn(values.email, values.password)
      void navigate('/today', { replace: true })
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
    }
  }

  return (
    <AuthLayout
      title={productCopy.auth.signInTitle}
      subtitle={productCopy.auth.signInSubtitle}
      alternate={{ label: 'New here?', action: 'Create an account', to: '/signup' }}
    >
      {status === 'configuration-missing' ? <ConfigurationNotice /> : null}
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="auth-form__meta">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        {formError ? <p className="form-error" role="alert">{formError}</p> : null}
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={status === 'configuration-missing' || status === 'loading'}
        >
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
