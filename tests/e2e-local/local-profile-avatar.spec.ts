import { expect, test } from '@playwright/test'

test('crops a profile photo and keeps the shell avatar circular on iPad', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'local-tablet', 'Tablet-specific profile regression.')

  const email = `profile-tablet-${crypto.randomUUID()}@local.test`
  const password = 'LocalTest!2026'
  let token: string | null = null

  try {
    await page.goto('/signup')
    await page.locator('input[name="displayName"]').fill('Profile Crop Tester')
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/today$/)
    const photoBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 200, height: 100 } })

    await page.getByRole('link', { name: 'Settings' }).click()
    const fileInput = page.locator('.profile-settings-form__photo input[type="file"]')
    await fileInput.setInputFiles({
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: photoBuffer,
    })

    const cropDialog = page.getByRole('dialog', { name: 'Frame your photo' })
    await expect(cropDialog).toBeVisible()
    await cropDialog.getByRole('slider', { name: 'Zoom' }).fill('1.5')
    await cropDialog.getByRole('button', { name: 'Use photo' }).click()
    await expect(cropDialog).toBeHidden()

    const shellAvatar = page.locator('.account-chip__avatar')
    const shellImage = shellAvatar.locator('img')
    await expect(shellImage).toBeVisible()
    const [avatarBox, imageBox] = await Promise.all([
      shellAvatar.boundingBox(),
      shellImage.boundingBox(),
    ])
    expect(avatarBox).not.toBeNull()
    expect(imageBox).not.toBeNull()
    if (avatarBox && imageBox) {
      expect(avatarBox.width).toBeCloseTo(avatarBox.height, 0)
      expect(imageBox.width).toBeCloseTo(avatarBox.width, 0)
      expect(imageBox.height).toBeCloseTo(avatarBox.height, 0)
    }

    await page.reload()
    await expect(shellImage).toBeVisible()
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
