import { mkdir } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import { chromium } from '@playwright/test'

const outputDirectory = new URL('../docs/assets/screens/', import.meta.url)
await mkdir(fileURLToPath(outputDirectory), { recursive: true })

const browser = await chromium.launch()
try {
  const views = [
    { name: 'login-mobile-light.png', width: 390, height: 844 },
    { name: 'login-desktop-light.png', width: 1280, height: 900 },
  ]

  for (const view of views) {
    const page = await browser.newPage({
      viewport: { width: view.width, height: view.height },
      colorScheme: 'light',
      deviceScaleFactor: 1,
    })
    await page.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle' })
    await page.screenshot({ path: fileURLToPath(new URL(view.name, outputDirectory)), fullPage: true })
    await page.close()
  }
} finally {
  await browser.close()
}
