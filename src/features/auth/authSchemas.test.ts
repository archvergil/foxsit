import { describe, expect, it } from 'vitest'

import { signInSchema, signUpSchema } from './authSchemas'

describe('authentication schemas', () => {
  it('requires a valid email at sign in', () => {
    const result = signInSchema.safeParse({ email: 'invalid', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('requires matching sign-up passwords', () => {
    const result = signUpSchema.safeParse({
      displayName: 'Taylor',
      email: 'taylor@example.com',
      password: 'secure-pass',
      confirmPassword: 'different-pass',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain('Passwords do not match.')
    }
  })

  it('accepts a valid account payload', () => {
    expect(
      signUpSchema.safeParse({
        displayName: 'Taylor',
        email: 'taylor@example.com',
        password: 'secure-pass',
        confirmPassword: 'secure-pass',
      }).success,
    ).toBe(true)
  })
})
