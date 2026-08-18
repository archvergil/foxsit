import { expect, test } from '@playwright/test'

test('public login remains honest and touch accessible', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(page.getByText('Connect Supabase to continue')).toBeVisible()

  const signIn = page.getByRole('button', { name: 'Sign in' })
  await expect(signIn).toBeDisabled()
  const box = await signIn.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)
})

test('signup is available without a broken navigation action', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: /Create an account/i }).click()
  await expect(page).toHaveURL(/\/signup$/)
  await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible()
})

test('a direct protected route refresh resolves through the SPA and AuthGuard', async ({ page }) => {
  await page.goto('/tasks')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})
