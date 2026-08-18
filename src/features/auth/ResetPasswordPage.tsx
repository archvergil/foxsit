import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { AuthLayout } from './AuthLayout'
import { getAuthErrorMessage, passwordSchema, type PasswordValues } from './authSchemas'
import { useAuth } from './authContext'

export default function ResetPasswordPage() {
  const { updatePassword, status } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  const onSubmit = async ({ password }: PasswordValues) => {
    setFormError(null)
    try {
      await updatePassword(password)
      void navigate('/today', { replace: true })
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use a strong password you do not reuse elsewhere."
      alternate={{ label: 'Link expired?', action: 'Request another', to: '/forgot-password' }}
    >
      {status !== 'authenticated' ? (
        <p className="form-error" role="alert">
          Open this page from the recovery link in your email.
        </p>
      ) : null}
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
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
        <Button type="submit" isLoading={isSubmitting} disabled={status !== 'authenticated'}>
          Save new password
        </Button>
      </form>
    </AuthLayout>
  )
}
