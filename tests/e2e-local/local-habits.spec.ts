import { expect, test } from '@playwright/test'

const deleteLocalAccount = async (token: string) => {
  const response = await fetch('http://127.0.0.1:8787/v1/auth/account', {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  })
  expect(response.ok, await response.text()).toBeTruthy()
}

test('creates a count habit and preserves progress, skip and archive across reloads', async ({ page }) => {
  test.setTimeout(60_000)
  const email = `habits-${crypto.randomUUID()}@local.test`
  const password = 'LocalTest!2026'
  let token: string | null = null

  try {
    await page.goto('/signup')
    await page.locator('input[name="displayName"]').fill('Habit Tester')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/today$/)

    await page.goto('/habits')
    await expect(page.getByRole('heading', { name: "Today's rhythm" })).toBeVisible()
    await page.getByRole('button', { name: 'New habit' }).click()
    const editor = page.locator('.habit-editor')
    await editor.getByRole('textbox', { name: 'Title' }).fill('Drink water')
    await editor.getByRole('button', { name: 'Water' }).click()
    await editor.getByRole('spinbutton', { name: 'Daily target' }).fill('2')
    await editor.getByRole('textbox', { name: 'Unit' }).fill('glasses')
    await editor.getByRole('button', { name: 'Create habit' }).click()

    const card = page.locator('.habit-today-card').filter({ hasText: 'Drink water' })
    await expect(card).toContainText('0/2 glasses')
    const firstProgressResponse = page.waitForResponse((response) => (
      response.url().endsWith('/v1/habit-logs') && response.request().method() === 'PUT'
    ))
    await card.getByRole('button', { name: 'Increment Drink water' }).click()
    const firstProgress = await firstProgressResponse
    expect(firstProgress.ok(), await firstProgress.text()).toBeTruthy()
    await expect(card).toContainText('1/2 glasses')
    await card.getByRole('button', { name: 'Increment Drink water' }).click()
    await expect(card).toContainText('2/2 glasses')

    await page.reload()
    await expect(card).toContainText('2/2 glasses')
    await card.getByRole('button', { name: 'Undo Drink water' }).click()
    await expect(card).toContainText('1/2 glasses')
    await card.getByRole('button', { name: 'Skip Drink water' }).click()
    await card.getByRole('textbox', { name: 'Reason optional' }).fill('Recovery day')
    const skipResponsePromise = page.waitForResponse((response) => (
      response.url().endsWith('/v1/habit-logs') && response.request().method() === 'PUT'
    ))
    await card.getByRole('button', { name: 'Confirm skip' }).click()
    const skipResponse = await skipResponsePromise
    expect(skipResponse.ok(), await skipResponse.text()).toBeTruthy()
    await expect(card).toContainText('Skipped')

    await page.reload()
    await expect(card).toContainText('Skipped')
    await page.getByRole('link', { name: 'Insights' }).click()
    await expect(page.getByRole('heading', { name: 'Read the pattern, not a guess.' })).toBeVisible()
    await expect(page.getByText('Recovery day')).toBeVisible()
    await page.getByRole('navigation', { name: 'Habit view' }).getByRole('link', { name: 'Today' }).click()
    await card.getByRole('button', { name: 'Restore Drink water' }).click()
    await expect(card).toContainText('0/2 glasses')

    await card.getByRole('button', { name: 'Edit habit Drink water' }).click()
    await editor.getByRole('textbox', { name: 'Title' }).fill('Hydrate')
    await editor.getByRole('button', { name: 'Save habit' }).click()
    const updatedCard = page.locator('.habit-today-card').filter({ hasText: 'Hydrate' })
    await expect(updatedCard).toBeVisible()
    await updatedCard.getByRole('button', { name: 'Edit habit Hydrate' }).click()
    await editor.getByRole('button', { name: 'Archive' }).click()
    await expect(page.getByText('Your first habit starts here.')).toBeVisible()

    await page.reload()
    await expect(page.getByText('Your first habit starts here.')).toBeVisible()
    await page.getByRole('link', { name: 'Insights' }).click()
    await expect(page.getByText('Hydrate is archived.')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Hydrate is archived.')).toBeVisible()
    await page.getByRole('button', { name: 'Restore' }).click()
    await expect(page.getByText('Hydrate is archived.')).toBeHidden()
    await page.getByRole('navigation', { name: 'Habit view' }).getByRole('link', { name: 'Today' }).click()
    await expect(page.locator('.habit-today-card').filter({ hasText: 'Hydrate' })).toBeVisible()

    await page.getByRole('button', { name: 'New habit' }).click()
    await editor.getByRole('textbox', { name: 'Title' }).fill('Stretch')
    await editor.getByRole('button', { name: 'Create habit' }).click()
    await page.getByRole('button', { name: 'Move Stretch up' }).click()
    await expect(page.locator('.habit-today-card').first()).toContainText('Stretch')
    await page.reload()
    await expect(page.locator('.habit-today-card').first()).toContainText('Stretch')
    token = await page.evaluate(() => localStorage.getItem('app.local-session-token'))
  } finally {
    if (!token) token = await page.evaluate(() => localStorage.getItem('app.local-session-token')).catch(() => null)
    if (token) await deleteLocalAccount(token)
  }
})

test('creates three habits with expanded icons and persists their project assignment', async ({ page }) => {
  test.setTimeout(60_000)
  const email = `habit-icons-${crypto.randomUUID()}@local.test`
  const password = 'LocalTest!2026'
  let token: string | null = null

  try {
    await page.goto('/signup')
    await page.locator('input[name="displayName"]').fill('Icon Contract Tester')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/today$/)

    await page.goto('/habits')
    await page.getByRole('button', { name: 'New project' }).click()
    const projectEditor = page.getByRole('dialog', { name: 'Create habit project' })
    await projectEditor.getByRole('textbox', { name: 'Name' }).fill('Health')
    await projectEditor.getByRole('button', { name: 'Create project' }).click()

    for (const [title, iconLabel] of [
      ['Breakfast', 'Nutrition'], ['Medicine', 'Medication'], ['Budget', 'Budget'],
    ] as const) {
      await page.getByRole('button', { name: 'New habit' }).click()
      const editor = page.locator('.habit-editor')
      await editor.getByRole('textbox', { name: 'Title' }).fill(title)
      await editor.getByRole('combobox', { name: 'Project' }).selectOption({ label: 'Health' })
      await editor.getByRole('button', { name: 'More habit icons' }).click()
      await page.getByRole('dialog', { name: 'More habit icons' }).getByRole('button', { name: iconLabel }).click()
      const createResponsePromise = page.waitForResponse((response) => (
        response.url().endsWith('/v1/habits') && response.request().method() === 'POST'
      ))
      await editor.getByRole('button', { name: 'Create habit' }).click()
      const createResponse = await createResponsePromise
      expect(createResponse.ok(), await createResponse.text()).toBeTruthy()
      await expect(page.locator('.habit-today-card').filter({ hasText: title })).toBeVisible()
    }

    await page.reload()
    const project = page.locator('.habit-project-group').filter({ hasText: 'Health' })
    await expect(project).toContainText('3 scheduled today')
    await expect(project.locator('.habit-today-card')).toHaveCount(3)
    token = await page.evaluate(() => localStorage.getItem('app.local-session-token'))
  } finally {
    if (!token) token = await page.evaluate(() => localStorage.getItem('app.local-session-token')).catch(() => null)
    if (token) await deleteLocalAccount(token)
  }
})
