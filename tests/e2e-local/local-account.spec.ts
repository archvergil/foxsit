import { expect, test } from '@playwright/test'

test('creates a local account and keeps its task after reload', async ({ page }) => {
  const email = `playwright-${crypto.randomUUID()}@local.test`
  const password = 'LocalTest!2026'
  let token: string | null = null

  try {
    await page.goto('/signup')
    await page.locator('input[name="displayName"]').fill('Local Tester')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page).toHaveURL(/\/today$/)
    await page.getByRole('link', { name: 'Tasks' }).first().click()
    await page.getByRole('textbox', { name: 'Task title' }).fill('Persistent local task')
    await page.getByRole('textbox', { name: 'Task title' }).press('Enter')
    await expect(page.getByText('Persistent local task', { exact: true })).toBeVisible()

    await page.reload()
    await expect(page.getByText('Persistent local task', { exact: true })).toBeVisible()
    token = await page.evaluate(() => localStorage.getItem('app.local-session-token'))
  } finally {
    if (token) {
      await fetch('http://127.0.0.1:8787/v1/auth/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
  }
})
