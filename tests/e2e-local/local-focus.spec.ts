import { expect, test } from '@playwright/test'

test('links a task, restores a paused timer and writes local focus history', async ({ page }) => {
  const email = `focus-${crypto.randomUUID()}@local.test`
  const password = 'LocalTest!2026'
  let token: string | null = null

  try {
    await page.goto('/signup')
    await page.locator('input[name="displayName"]').fill('Focus Tester')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/today$/)

    await page.getByRole('link', { name: 'Tasks' }).first().click()
    await page.getByRole('textbox', { name: 'Task title' }).fill('Write the release notes')
    await page.getByRole('textbox', { name: 'Task title' }).press('Enter')
    await page.getByRole('link', { name: 'Start focus for Write the release notes' }).click()
    await expect(page).toHaveURL(/\/focus\?taskId=/)
    await expect(page.getByLabel('Link a task')).toHaveValue(/.+/)

    await page.getByRole('spinbutton', { name: 'Focus' }).fill('1')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByText('01:00', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Start timer' }).click()
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(page.getByText('Paused — your progress is safe.')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Resume', exact: true }).click()
    await page.waitForTimeout(1_200)
    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible()
    await expect(page.locator('.focus-history__row').first()).toContainText('Focus')
    await expect(page.locator('.focus-history__row').first()).toContainText('Write the release notes')

    token = await page.evaluate(() => localStorage.getItem('app.local-session-token'))
    const response = await fetch('http://127.0.0.1:8787/v1/focus-sessions', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.ok).toBe(true)
    const payload = await response.json() as {
      data: Array<{ sessionType: string; completed: boolean }>
    }
    expect(payload.data).toMatchObject([
      { sessionType: 'focus', completed: false },
    ])
  } finally {
    if (!token) token = await page.evaluate(() => localStorage.getItem('app.local-session-token')).catch(() => null)
    if (token) {
      await fetch('http://127.0.0.1:8787/v1/auth/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    }
  }
})
