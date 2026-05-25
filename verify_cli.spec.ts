import { test, expect } from '@playwright/test';

test('Verify Router and Switch CLI compatibility', async ({ page }) => {
  // Go to the application
  await page.goto('http://localhost:3000');

  // Handle the Welcome Dialog
  const skipButton = page.locator('button:has-text("Atla"), button:has-text("Skip")');
  if (await skipButton.isVisible()) {
    await skipButton.click();
  }

  // 1. Add a Router
  await page.getByLabel('Add Router').click();

  // 2. Add an L2 Switch
  await page.getByLabel('Add L2 Switch').click();

  // 3. Open Router Terminal
  // Find the router on canvas and double click.
  // Since we just added it, it's likely the first/only router.
  await page.locator('canvas').click({ position: { x: 400, y: 300 } }); // Rough position for first device
  await page.locator('canvas').dblclick({ position: { x: 400, y: 300 } });

  // Wait for terminal
  await page.waitForSelector('text=Terminal');

  // Type commands in Router
  await page.keyboard.type('enable');
  await page.keyboard.press('Enter');
  await page.keyboard.type('configure terminal');
  await page.keyboard.press('Enter');

  // Test "ip routing" on Router (should work)
  await page.keyboard.type('ip routing');
  await page.keyboard.press('Enter');

  // Check if "ip routing" is accepted (no error message "% Invalid input")
  const terminalContent = page.locator('.terminal');
  await expect(terminalContent).not.toContainText('Invalid input');

  await page.screenshot({ path: '/home/jules/verification/screenshots/router_ip_routing.png' });

  // Close terminal
  await page.keyboard.press('Escape');

  // 4. Open Switch Terminal
  // Second device is usually offset
  await page.locator('canvas').dblclick({ position: { x: 500, y: 300 } });

  await page.waitForSelector('text=Terminal');

  await page.keyboard.type('enable');
  await page.keyboard.press('Enter');
  await page.keyboard.type('configure terminal');
  await page.keyboard.press('Enter');

  // Test "ip routing" on L2 Switch (should fail with my new error message)
  await page.keyboard.type('ip routing');
  await page.keyboard.press('Enter');

  await expect(terminalContent).toContainText('ip routing is not supported on this Layer 2 switch');

  await page.screenshot({ path: '/home/jules/verification/screenshots/switch_ip_routing_fail.png' });
});
