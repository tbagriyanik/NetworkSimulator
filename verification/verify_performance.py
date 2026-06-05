from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000/basic-secure")
    page.wait_for_timeout(5000)

    # If there is a dialog/overlay, close it first
    try:
        # Looking for close buttons or pressing Escape
        page.keyboard.press("Escape")
        page.wait_for_timeout(1000)
    except:
        pass

    # Click on a device to select it
    devices = page.locator('[data-device-id]')
    count = devices.count()
    print(f"Found {count} devices")
    if count > 0:
        # Try to click with force=True if still intercepted
        device_id = devices.first.get_attribute('data-device-id')
        print(f"Clicking on device: {device_id}")
        devices.first.click(force=True)
        page.wait_for_timeout(1000)
        devices.first.click(button="right", force=True)
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/screenshots/context_menu.png")
    else:
        print("No devices found on canvas")

    page.screenshot(path="verification/screenshots/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
