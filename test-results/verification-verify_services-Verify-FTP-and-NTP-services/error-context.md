# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verification/verify_services.spec.ts >> Verify FTP and NTP services
- Location: verification/verify_services.spec.ts:4:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByText('SW1').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - generic [ref=e6]:
      - banner [ref=e7]:
        - generic [ref=e9]:
          - button "Reload page" [ref=e10] [cursor=pointer]:
            - img "Logo" [ref=e12]
            - generic [ref=e13]:
              - heading "Network Simulator" [level=2] [ref=e14]
              - paragraph [ref=e15]: Develop Your Networking Skills
          - generic [ref=e17]:
            - generic [ref=e19]:
              - button "New Project" [ref=e20] [cursor=pointer]:
                - img [ref=e21]
              - button "Load Project" [ref=e24] [cursor=pointer]:
                - img [ref=e25]
              - button "Save Project" [ref=e27] [cursor=pointer]:
                - img [ref=e28]
              - button "Contact" [ref=e32] [cursor=pointer]:
                - img [ref=e33]
            - button "My Achievements" [ref=e35] [cursor=pointer]:
              - img [ref=e36]
            - button "EN" [ref=e43] [cursor=pointer]:
              - img [ref=e44]
              - text: EN
            - button "Light Mode" [ref=e48] [cursor=pointer]:
              - img [ref=e49]
            - button "Low Resolution" [ref=e55] [cursor=pointer]:
              - img [ref=e56]
      - main [ref=e60]:
        - generic [ref=e62]:
          - generic [ref=e63]:
            - button "Reset" [ref=e64] [cursor=pointer]:
              - img
            - button "Select Device" [ref=e65] [cursor=pointer]:
              - generic [ref=e66]:
                - img
                - generic [ref=e67]: Select Device
              - img
            - generic [ref=e68]:
              - button "Add PC" [ref=e69] [cursor=pointer]:
                - img
              - button "Add L2 Switch" [ref=e70] [cursor=pointer]:
                - img
              - button "Add L3 Switch" [ref=e71] [cursor=pointer]:
                - img
              - button "Add Router" [ref=e72] [cursor=pointer]:
                - img
              - button "Add IoT" [ref=e73] [cursor=pointer]:
                - img
              - button "Add Firewall" [ref=e74] [cursor=pointer]:
                - img
            - generic [ref=e75]:
              - button "Straight cable" [ref=e76] [cursor=pointer]:
                - img
              - button "Crossover cable" [ref=e77] [cursor=pointer]:
                - img
              - button "Console cable" [ref=e78] [cursor=pointer]:
                - img
            - button "Connect Devices" [ref=e80] [cursor=pointer]:
              - img
            - button "Ping" [ref=e81] [cursor=pointer]:
              - img
            - button "Add Note" [ref=e82] [cursor=pointer]:
              - img
            - button "Settings" [ref=e83] [cursor=pointer]:
              - img
            - button "Undo" [ref=e85] [cursor=pointer]:
              - img
            - button "Redo" [disabled]:
              - img
            - button "Refresh Network" [ref=e87] [cursor=pointer]:
              - img
          - generic [ref=e91]:
            - application "Network topology canvas. You can drag devices to move them." [ref=e92]:
              - img [ref=e93]:
                - generic [ref=e94]:
                  - generic [ref=e95]:
                    - generic [ref=e99]:
                      - generic: eth0 ↔ fa0/1
                      - generic: eth0 ↔ fa0/1
                    - generic [ref=e103]:
                      - generic: eth0 ↔ fa0/2
                      - generic: eth0 ↔ fa0/2
                    - generic [ref=e107]:
                      - generic: eth0 ↔ fa0/3
                      - generic: eth0 ↔ fa0/3
                    - generic [ref=e111]:
                      - generic: eth0 ↔ fa0/4
                      - generic: eth0 ↔ fa0/4
                    - generic [ref=e115]:
                      - generic: eth0 ↔ fa0/5
                      - generic: eth0 ↔ fa0/5
                    - generic [ref=e119]:
                      - generic: eth0 ↔ fa0/6
                      - generic: eth0 ↔ fa0/6
                    - img [ref=e127] [cursor=pointer]
                    - img [ref=e134] [cursor=pointer]
                    - img [ref=e141] [cursor=pointer]
                    - img [ref=e148] [cursor=pointer]
                    - img [ref=e155] [cursor=pointer]
                    - img [ref=e162] [cursor=pointer]
                    - button "PC-DNS" [ref=e165] [cursor=pointer]:
                      - generic [ref=e167]:
                        - generic "WiFi status" [ref=e170]
                        - generic "Power off" [ref=e180]
                        - generic: PC-DNS
                        - generic: 192.168.1.10
                        - generic: VLAN 1
                        - generic [ref=e183]:
                          - generic: E
                        - generic [ref=e185]:
                          - generic: C
                    - button "PC-HTTP" [ref=e187] [cursor=pointer]:
                      - generic [ref=e189]:
                        - generic "WiFi status" [ref=e192]
                        - generic "Power off" [ref=e202]
                        - generic: PC-HTTP
                        - generic: 192.168.1.20
                        - generic: VLAN 1
                        - generic [ref=e205]:
                          - generic: E
                        - generic [ref=e207]:
                          - generic: C
                    - button "PC-DHCP" [ref=e209] [cursor=pointer]:
                      - generic [ref=e211]:
                        - generic "WiFi status" [ref=e214]
                        - generic "Power off" [ref=e224]
                        - generic: PC-DHCP
                        - generic: 192.168.1.30
                        - generic: VLAN 1
                        - generic [ref=e227]:
                          - generic: E
                        - generic [ref=e229]:
                          - generic: C
                    - button "PC-FTP" [ref=e231] [cursor=pointer]:
                      - generic [ref=e233]:
                        - generic "WiFi status" [ref=e236]
                        - generic "Power off" [ref=e246]
                        - generic: PC-FTP
                        - generic: 192.168.1.40
                        - generic: VLAN 1
                        - generic [ref=e249]:
                          - generic: E
                        - generic [ref=e251]:
                          - generic: C
                    - button "PC-MAIL" [ref=e253] [cursor=pointer]:
                      - generic [ref=e255]:
                        - generic "WiFi status" [ref=e258]
                        - generic "Power off" [ref=e268]
                        - generic: PC-MAIL
                        - generic: 192.168.1.50
                        - generic: VLAN 1
                        - generic [ref=e271]:
                          - generic: E
                        - generic [ref=e273]:
                          - generic: C
                    - button "PC-NTP" [ref=e275] [cursor=pointer]:
                      - generic [ref=e277]:
                        - generic "WiFi status" [ref=e280]
                        - generic "Power off" [ref=e290]
                        - generic: PC-NTP
                        - generic: 192.168.1.60
                        - generic: VLAN 1
                        - generic [ref=e293]:
                          - generic: E
                        - generic [ref=e295]:
                          - generic: C
                    - button "Switch" [ref=e297] [cursor=pointer]:
                      - generic [ref=e299]:
                        - generic "Power off" [ref=e305]
                        - generic: Switch
                        - generic [ref=e308]:
                          - generic: "1"
                        - generic [ref=e310]:
                          - generic: "2"
                        - generic [ref=e312]:
                          - generic: "3"
                        - generic [ref=e314]:
                          - generic: "4"
                        - generic [ref=e316]:
                          - generic: "5"
                        - generic [ref=e318]:
                          - generic: "6"
                        - generic [ref=e320]:
                          - generic: "7"
                        - generic [ref=e322]:
                          - generic: "8"
                        - generic [ref=e324]:
                          - generic: "9"
                        - generic [ref=e326]:
                          - generic: "10"
                        - generic [ref=e328]:
                          - generic: "11"
                        - generic [ref=e330]:
                          - generic: "12"
                        - generic [ref=e332]:
                          - generic: "13"
                        - generic [ref=e334]:
                          - generic: "14"
                        - generic [ref=e336]:
                          - generic: "15"
                        - generic [ref=e338]:
                          - generic: "16"
                        - generic [ref=e340]:
                          - generic: "17"
                        - generic [ref=e342]:
                          - generic: "18"
                        - generic [ref=e344]:
                          - generic: "19"
                        - generic [ref=e346]:
                          - generic: "20"
                        - generic [ref=e348]:
                          - generic: "21"
                        - generic [ref=e350]:
                          - generic: "22"
                        - generic [ref=e352]:
                          - generic: "23"
                        - generic [ref=e354]:
                          - generic: "24"
                        - generic [ref=e356]:
                          - generic: C
                        - generic [ref=e358]:
                          - generic: "1"
                        - generic [ref=e360]:
                          - generic: "2"
                    - generic [ref=e362]:
                      - generic [ref=e363]:
                        - generic [ref=e364]:
                          - button "Color" [ref=e365] [cursor=pointer]
                          - button "F" [ref=e366] [cursor=pointer]
                          - button "14" [ref=e367] [cursor=pointer]
                          - button "80" [ref=e368] [cursor=pointer]
                          - button "D" [ref=e369] [cursor=pointer]
                        - button "Delete" [ref=e370] [cursor=pointer]:
                          - img [ref=e371]
                      - textbox "Note content" [ref=e374]: "🌐 Services Lab: In this lab, 6 different network services are running on PCs: 1) DNS (1.10): Resolves www.lab.local, ftp.lab.local. 2) HTTP (1.20): Web server. 3) DHCP (1.30): Distributes IPs in 192.168.1.100+ range. 4) FTP (1.40): File sharing server. 5) MAIL (1.50): Mail server (admin@lab.local). 6) NTP (1.60): Time server. Tests: • Run \"nslookup www.lab.local\" in a PC terminal. • Use \"wget www.lab.local\" to view the web page. • Use \"ftp 192.168.1.40\" to try file uploading (put). • On the Switch: \"ntp server 192.168.1.60\" then \"show clock\" to check time sync."
                      - img "Resize" [ref=e376]
                  - generic [ref=e381]: 3000 × 2000
            - generic [ref=e382]:
              - button "−" [ref=e383] [cursor=pointer]
              - button "100%" [ref=e384] [cursor=pointer]
              - button "+" [ref=e385] [cursor=pointer]
              - button "Reset" [ref=e387] [cursor=pointer]
      - contentinfo [ref=e388]:
        - generic [ref=e391]:
          - generic [ref=e394]: "Saved: 7:52:41 PM•All Services Lab (DNS, HTTP, FTP, MAIL, NTP, DHCP)"
          - generic [ref=e395]:
            - generic [ref=e396]: 🕸️
            - generic [ref=e397]:
              - text: (Shift) TABTAB for next deviceCtrl+SSave|7 devices
              - generic [ref=e398]:
                - generic [ref=e399]: LeftMB
                - text: :Pan
                - generic [ref=e400]: ·
                - generic [ref=e401]: MidMB
                - text: :Box
                - generic [ref=e402]: ·
                - generic [ref=e403]: RightMB
                - text: :Menu
                - generic [ref=e404]: ·
                - generic [ref=e405]: Wheel
                - text: :Zoom
    - region "Notifications (F8)":
      - list
  - region "Notifications (F8)":
    - list
  - alert [ref=e406]
```

# Test source

```ts
  1  |
  2  | import { test, expect } from '@playwright/test';
  3  |
  4  | test('Verify FTP and NTP services', async ({ page }) => {
  5  |   // Go to the app
  6  |   await page.goto('http://localhost:3000');
  7  |
  8  |   // Wait for onboarding and skip it
  9  |   const skipButton = page.getByRole('button', { name: 'Skip' });
  10 |   try {
  11 |     await skipButton.waitFor({ state: 'visible', timeout: 5000 });
  12 |     await skipButton.click();
  13 |     console.log('Skipped onboarding');
  14 |   } catch (e) {
  15 |     console.log('Onboarding skip button not found or already gone');
  16 |   }
  17 |
  18 |   // Wait a bit for transitions
  19 |   await page.waitForTimeout(1000);
  20 |
  21 |   // Click the New Project button (File icon)
  22 |   // t.newProject is "New Project" or "Yeni Proje"
  23 |   const newProjectButton = page.locator('button[aria-label="New Project"], button[aria-label="Yeni Proje"]').first();
  24 |   await newProjectButton.click();
  25 |   console.log('Clicked New Project button');
  26 |
  27 |   // Find and click the new "All Services Lab"
  28 |   // It might be under "All Projects" or "Guided Mode"
  29 |   // In the picker it should be visible if we search or scroll
  30 |   const labItem = page.getByText('All Services Lab');
  31 |   await labItem.waitFor({ state: 'visible', timeout: 5000 });
  32 |   await labItem.click();
  33 |   console.log('Clicked All Services Lab');
  34 |
  35 |   // Wait for the lab to load
  36 |   await page.waitForTimeout(3000);
  37 |
  38 |   // Take a screenshot of the loaded lab
  39 |   await page.screenshot({ path: 'verification/screenshots/all_services_lab.png' });
  40 |
  41 |   // Open PC-FTP
  42 |   // We can click on the text "PC-FTP" in the canvas or list
  43 |   const ftpClient = page.getByText('PC-FTP').first();
  44 |   await ftpClient.click();
  45 |   await page.waitForTimeout(1000);
  46 |   await page.screenshot({ path: 'verification/screenshots/ftp_client_panel.png' });
  47 |
  48 |   // Close PC panel
  49 |   await page.locator('button:has(svg.lucide-x)').first().click();
  50 |
  51 |   // Open SW1
  52 |   const switch1 = page.getByText('SW1').first();
> 53 |   await switch1.click();
     |                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  54 |   await page.waitForTimeout(1000);
  55 |   await page.screenshot({ path: 'verification/screenshots/switch_panel.png' });
  56 | });
  57 |
```