import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { ConfigurationNotice } from '@/components/feedback/ConfigurationNotice'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { AuthLayout } from './AuthLayout'
import { emailSchema, getAuthErrorMessage, type EmailValues } from './authSchemas'
import { useAuth } from './authContext'

export default function ForgotPasswordPage() {
  const { requestPasswordReset, status } = useAuth()
  const [sent, setSent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema) })

  const onSubmit = async ({ email }: EmailValues) => {
    setFormError(null)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We will send a secure recovery link to your inbox."
      alternate={{ label: 'Remembered it?', action: 'Back to sign in', to: '/login' }}
    >
      {sent ? (
        <div className="auth-success" role="status">
          <MailCheck aria-hidden />
          <h2>Check your inbox</h2>
          <p>If the account exists, a recovery link is on its way.</p>
        </div>
      ) : (
        <>
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
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            <Button type="submit" isLoading={isSubmitting} disabled={status === 'configuration-missing'}>
              Send recovery link
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
