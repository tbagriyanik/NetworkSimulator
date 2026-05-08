import { test, expect } from '@playwright/test';

test('verify IoT panel rendering', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for the app to load
  await page.waitForSelector('canvas');

  // Close tour if it exists
  const skipButton = page.getByRole('button', { name: /skip|close/i });
  if (await skipButton.isVisible()) {
    await skipButton.click();
  }

  // Click on PC-1 node on the canvas
  // From previous screenshot, PC-1 is around (80, 330)
  await page.mouse.click(80, 330);

  // Wait for PC-1 panel to appear
  await page.waitForSelector('text=PC-1');

  // Click "Open" button in the PC-1 panel
  await page.getByRole('button', { name: 'Open' }).click();

  // Wait for the PC desktop/terminal view to appear
  // This usually contains a launcher or a terminal
  await page.waitForTimeout(1000); // Wait for transition

  await page.screenshot({ path: '/home/jules/verification/pc_desktop.png' });

  // Try to find the IoT button in the launcher
  // Based on PCPanel.tsx, it might be in a sidebar or desktop icons
  const iotButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2); // Heuristic
  // Actually let's look for text or specific icons

  // Let's try to just find "IoT" text if it's there
  const iotLauncherItem = page.getByText('IoT', { exact: true });
  if (await iotLauncherItem.isVisible()) {
    await iotLauncherItem.click();
  } else {
    // If not found, try to click the 3rd button in the vertical nav if it exists
    const navButtons = page.locator('nav button');
    if (await navButtons.count() > 0) {
       await navButtons.nth(2).click();
    }
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/jules/verification/iot_web_panel_view.png' });
});
