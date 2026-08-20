import { expect, test, type Locator } from '@playwright/test'

const expectInside = async (container: Locator, child: Locator) => {
  const [containerBox, childBox] = await Promise.all([container.boundingBox(), child.boundingBox()])
  expect(containerBox).not.toBeNull()
  expect(childBox).not.toBeNull()
  if (!containerBox || !childBox) return
  expect(childBox.x).toBeGreaterThanOrEqual(containerBox.x - 1)
  expect(childBox.x + childBox.width).toBeLessThanOrEqual(containerBox.x + containerBox.width + 1)
}

test('manages a project and restores task details with checklist', async ({ page }) => {
  const email = `task-details-${crypto.randomUUID()}@local.test`
  const password = 'LocalTest!2026'
  let token: string | null = null

  try {
    await page.goto('/signup')
    await page.locator('input[name="displayName"]').fill('Task Detail Tester')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/today$/)

    await page.getByRole('link', { name: 'Tasks' }).first().click()
    await page.getByRole('button', { name: 'New project' }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('Launch plan')
    await page.getByRole('combobox', { name: 'Color' }).selectOption('blue')
    await page.getByRole('button', { name: 'Save project' }).click()
    await expect(page.getByRole('heading', { name: 'Launch plan' })).toBeVisible()

    await page.getByRole('textbox', { name: 'Task title' }).fill('Publish release notes')
    await page.getByRole('textbox', { name: 'Task title' }).press('Enter')
    await page.getByRole('button', { name: 'Open details for Publish release notes' }).click()
    await page.getByRole('textbox', { name: 'Notes' }).fill('Include database changes')
    await page.getByRole('combobox', { name: 'Priority' }).selectOption('high')
    await page.getByLabel('Scheduled', { exact: true }).fill('2026-08-20')
    await page.getByRole('spinbutton', { name: 'Focus estimate' }).fill('45')
    await page.getByLabel(/Deadline/).fill('2026-08-20T09:30')
    await page.getByRole('button', { name: 'Save changes' }).click()

    await page.getByRole('textbox', { name: 'New checklist item' }).fill('Review final copy')
    await page.getByRole('button', { name: 'Add checklist item' }).click()
    await expect(page.getByText('Review final copy', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Complete Review final copy' }).click()
    await expect(page.getByRole('button', { name: 'Reopen Review final copy' })).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Open details for Publish release notes' }).click()
    await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue('Include database changes')
    await expect(page.getByRole('combobox', { name: 'Priority' })).toHaveValue('high')
    await expect(page.getByRole('spinbutton', { name: 'Focus estimate' })).toHaveValue('45')
    await expect(page.getByRole('button', { name: 'Reopen Review final copy' })).toBeVisible()

    await page.getByRole('button', { name: 'Close task details' }).click()
    await page.getByRole('textbox', { name: 'Task title' }).fill('Announce release')
    await page.getByRole('textbox', { name: 'Task title' }).press('Enter')
    await page.getByRole('button', { name: 'Move Announce release up' }).click()
    await expect(page.getByRole('button', { name: 'Move Announce release down' })).toBeEnabled()
    const taskTitles = page.locator('.task-list .task-row__content strong')
    await expect(taskTitles).toHaveText(['Announce release', 'Publish release notes'])

    await page.reload()
    await expect(taskTitles).toHaveText(['Announce release', 'Publish release notes'])

    await page.getByRole('button', { name: 'Edit Launch plan' }).click()
    const projectName = page.getByRole('textbox', { name: 'Name' })
    await projectName.fill('Launch archive')
    await page.getByRole('button', { name: 'Save project' }).click()
    await expect(page.getByRole('heading', { name: 'Launch archive' })).toBeVisible()

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

test('keeps the task composer and navigation stable on iPad', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'local-tablet', 'Tablet-specific layout regression.')

  const email = `task-tablet-${crypto.randomUUID()}@local.test`
  const password = 'LocalTest!2026'
  let token: string | null = null

  try {
    await page.goto('/signup')
    await page.locator('input[name="displayName"]').fill('Tablet Task Tester')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/today$/)

    await page.getByRole('link', { name: 'Tasks' }).first().click()
    await page.getByRole('button', { name: 'New project' }).click()
    await page.getByRole('textbox', { name: 'Name' }).fill('Tablet project')
    await page.getByRole('button', { name: 'Save project' }).click()
    await expect(page.getByRole('heading', { name: 'Tablet project' })).toBeVisible()

    const workspace = page.locator('.tasks-workspace')
    const composer = page.locator('.task-quick-add')
    const dateField = page.getByLabel('Scheduled date')
    const projectField = page.getByLabel('Project', { exact: true })
    const addButton = page.getByRole('button', { name: 'Add task' })

    await expect(composer).toBeVisible()
    await expectInside(workspace, dateField)
    await expectInside(workspace, projectField)
    await expectInside(workspace, addButton)

    const [dateBox, projectBox, buttonBox] = await Promise.all([
      dateField.boundingBox(),
      projectField.boundingBox(),
      addButton.boundingBox(),
    ])
    expect(dateBox).not.toBeNull()
    expect(projectBox).not.toBeNull()
    expect(buttonBox).not.toBeNull()
    if (dateBox && projectBox && buttonBox) {
      expect(dateBox.x + dateBox.width).toBeLessThanOrEqual(projectBox.x + 1)
      expect(buttonBox.y).toBeGreaterThanOrEqual(Math.max(dateBox.y + dateBox.height, projectBox.y + projectBox.height))
    }

    await page.setViewportSize({ width: 1194, height: 834 })
    await expectInside(workspace, dateField)
    await expectInside(workspace, projectField)
    await expectInside(workspace, addButton)

    const navigation = page.locator('.tasks-navigation')
    const inboxBox = await navigation.boundingBox()
    await page.getByRole('link', { name: 'Completed' }).click()
    await expect(page).toHaveURL(/\/tasks\/completed$/)
    const completedBox = await navigation.boundingBox()
    expect(inboxBox).not.toBeNull()
    expect(completedBox).not.toBeNull()
    if (inboxBox && completedBox) {
      expect(completedBox.height).toBeLessThanOrEqual(inboxBox.height + 1)
      expect(completedBox.height).toBeLessThanOrEqual(64)
    }

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
