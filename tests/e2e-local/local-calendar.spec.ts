import { expect, test } from '@playwright/test'

test('creates Calendar events in month, week and day and restores their details', async ({ page }) => {
  const email = `calendar-${crypto.randomUUID()}@local.test`
  const password = 'LocalTest!2026'
  let token: string | null = null

  try {
    await page.goto('/signup')
    await page.locator('input[name="displayName"]').fill('Calendar Tester')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/today$/)

    await page.goto('/tasks')
    await page.getByLabel('Scheduled date').fill('2026-08-17')
    await page.getByRole('textbox', { name: 'Task title' }).fill('Calendar overlay task')
    await page.getByRole('textbox', { name: 'Task title' }).press('Enter')
    await expect(page.getByText('Calendar overlay task', { exact: true })).toBeVisible()

    await page.goto('/habits')
    await page.getByRole('button', { name: 'New habit' }).click()
    const habitEditor = page.locator('.habit-editor')
    await habitEditor.getByRole('textbox', { name: 'Title' }).fill('Calendar overlay habit')
    const habitResponsePromise = page.waitForResponse((response) => (
      response.url().endsWith('/v1/habits') && response.request().method() === 'POST'
    ))
    await habitEditor.getByRole('button', { name: 'Create habit' }).click()
    const habitResponse = await habitResponsePromise
    expect(habitResponse.ok(), await habitResponse.text()).toBeTruthy()

    await page.goto('/calendar')
    await page.locator('.calendar-day__number--today').click()
    await expect(page.locator('.calendar-agenda-item').filter({ hasText: 'Calendar overlay habit' })).toContainText('Habit')
    await page.getByRole('button', { name: 'Select Monday, August 17, 2026, 1 items' }).click()
    await expect(page.locator('.calendar-agenda-item').filter({ hasText: 'Calendar overlay task' })).toBeVisible()
    await page.getByRole('button', { name: 'New event' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Local appointment')
    await page.getByRole('textbox', { name: 'Location' }).fill('Studio')
    await page.getByRole('button', { name: 'Create event', exact: true }).click()
    const agendaEvent = page.locator('.calendar-agenda-item').filter({ hasText: 'Local appointment' })
    await expect(agendaEvent).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Select Monday, August 17, 2026, 2 items' }).click()
    await expect(agendaEvent).toContainText('Studio')
    await agendaEvent.click()
    await page.getByRole('textbox', { name: 'Description' }).fill('Bring the monthly plan')
    await page.getByRole('button', { name: 'Save event' }).click()
    await expect(agendaEvent).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Select Monday, August 17, 2026, 2 items' }).click()
    await expect(agendaEvent).toBeVisible()
    await agendaEvent.click()
    await expect(page.getByRole('textbox', { name: 'Description' })).toHaveValue('Bring the monthly plan')

    await page.getByRole('link', { name: 'Week' }).click()
    await expect(page).toHaveURL(/\/calendar\/week$/)
    await expect(page.getByRole('heading', { name: 'Shape the week.' })).toBeVisible()
    const mobile = (page.viewportSize()?.width ?? 1280) < 768
    if (mobile) {
      await page.getByRole('button', { name: 'Show Mon 17' }).click()
      await expect(page.locator('.calendar-agenda-item').filter({ hasText: 'Local appointment' })).toBeVisible()
      await page.locator('.calendar-agenda').getByRole('button', { name: 'Event' }).click()
    } else {
      await expect(page.locator('.calendar-week-event').filter({ hasText: 'Local appointment' })).toBeVisible()
      await page.getByRole('button', { name: 'Create event on Monday, August 17, 2026 at 1 PM' }).click()
    }
    await page.getByRole('textbox', { name: 'Title' }).fill('Week slot')
    await page.getByRole('button', { name: 'Create event', exact: true }).click()
    const weekEvent = page.locator(mobile ? '.calendar-agenda-item' : '.calendar-week-event').filter({ hasText: 'Week slot' })
    await expect(weekEvent).toBeVisible()
    await page.reload()
    if (mobile) await page.getByRole('button', { name: 'Show Mon 17' }).click()
    await expect(weekEvent).toBeVisible()

    await page.goto('/calendar/day/2026-08-17')
    await expect(page).toHaveURL(/\/calendar\/day\/2026-08-17$/)
    await expect(page.getByRole('heading', { name: 'Protect the day.' })).toBeVisible()
    await page.getByRole('button', { name: 'Create event on Monday, August 17, 2026 at 3 PM' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('Day block')
    await page.getByRole('button', { name: 'Create event', exact: true }).click()
    const dayEvent = page.getByRole('button', { name: 'Edit event Day block' })
    await expect(dayEvent).toBeVisible()
    await page.reload()
    await expect(dayEvent).toBeVisible()
    await page.getByRole('button', { name: 'Next day' }).click()
    await expect(page).toHaveURL(/\/calendar\/day\/2026-08-18$/)
    token = await page.evaluate(() => localStorage.getItem('app.local-session-token'))
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
