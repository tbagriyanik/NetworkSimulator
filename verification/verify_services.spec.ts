import { test, expect } from '@playwright/test';

test('verify services lab and firewall quick rules', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('http://localhost:3000');
  await page.waitForSelector('button', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const closeOnboarding = page.getByRole('button', { name: /Kapat|Close|Başla|Start/i }).first();
  if (await closeOnboarding.isVisible()) {
    await closeOnboarding.click();
    await page.waitForTimeout(500);
  }

  // Load lab
  const newProjectBtn = page.locator('button[aria-label*="Project"], button[aria-label*="Proje"]').first();
  await newProjectBtn.click({ force: true });
  await page.waitForTimeout(1000);
  await page.getByText(/All Services Lab/i).click();
  await page.waitForTimeout(3000);

  // Take a full page screenshot to see state
  await page.screenshot({ path: 'verification/screenshots/all_services_lab.png', fullPage: true });
});
