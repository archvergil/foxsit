import { expect, test } from '@playwright/test'

test('locks page scaling and keeps form controls Safari-safe on mobile and iPad', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'local-desktop', 'The zoom contract applies to touch layouts.')

  await page.goto('/login')
  const viewport = page.locator('meta[name="viewport"]')
  await expect(viewport).toHaveAttribute('content', /maximum-scale=1/)
  await expect(viewport).toHaveAttribute('content', /user-scalable=no/)

  const email = page.locator('input[name="email"]')
  await expect(email).toBeVisible()
  await expect(email).toHaveCSS('font-size', '16px')
})
