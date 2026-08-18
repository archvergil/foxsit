import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ThemeProvider } from '@/features/settings/ThemeProvider'
import { AuthProvider } from './AuthProvider'
import LoginPage from './LoginPage'

describe('LoginPage', () => {
  it('shows an honest setup state when Supabase is not configured', () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByText('Connect Supabase to continue')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
    expect(screen.getByRole('link', { name: /Create an account/i })).toHaveAttribute('href', '/signup')
  })
})
