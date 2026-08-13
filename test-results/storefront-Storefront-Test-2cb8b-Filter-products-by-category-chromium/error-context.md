# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: storefront.spec.ts >> Storefront Tests >> SF-01: Filter products by category
- Location: tests\storefront.spec.ts:8:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('button').filter({ hasText: /ทั้งหมด/i })
Expected: visible
Received: undefined

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('button').filter({ hasText: /ทั้งหมด/i })
  - Protocol error (Runtime.callFunctionOn): Internal server error, session closed.

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Storefront Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |   });
  7  | 
  8  |   test('SF-01: Filter products by category', async ({ page }) => {
  9  |     // Wait for categories to load
  10 |     await page.waitForTimeout(1000);
  11 |     // Find category buttons (e.g. "อาหาร", "เครื่องดื่ม", "ของใช้")
  12 |     // Let's just click any button that is not 'ทั้งหมด' if available
  13 |     const allBtn = page.locator('button', { hasText: /ทั้งหมด/i });
  14 |     if (await allBtn.count() > 0) {
> 15 |        expect(allBtn).toBeVisible();
     |                       ^ Error: expect(locator).toBeVisible() failed
  16 |     }
  17 |   });
  18 | 
  19 |   test('SF-05: Add item to cart', async ({ page }) => {
  20 |     // Find the first add to cart button (plus icon)
  21 |     // We will click it, then check if the cart badge increases
  22 |     await page.waitForTimeout(1000); // Wait for products to load
  23 |     
  24 |     // Select the first button that has a plus SVG inside
  25 |     const addButton = page.locator('button:has(svg.lucide-plus)').first();
  26 |     
  27 |     if (await addButton.isVisible()) {
  28 |       await addButton.click();
  29 |       await page.waitForTimeout(500);
  30 |       
  31 |       // Look for the cart badge. It should have the red dot with '1'
  32 |       const cartBadge = page.locator('span.bg-red-500').first();
  33 |       await expect(cartBadge).toBeVisible();
  34 |       
  35 |       const badgeText = await cartBadge.textContent();
  36 |       expect(badgeText?.trim()).toBe('1');
  37 |     }
  38 |   });
  39 | 
  40 |   test('SF-02: Hidden Admin Login Trigger', async ({ page }) => {
  41 |     // Click the logo 5 times
  42 |     const logo = page.locator('text=tap2room').first();
  43 |     await expect(logo).toBeVisible();
  44 |     
  45 |     await logo.click({ clickCount: 5, delay: 100 });
  46 |     
  47 |     // Expect the admin modal to appear
  48 |     const adminModalTitle = page.locator('text=เข้าสู่ระบบ'); // partial text for 'เข้าสู่ระบบผู้ดูแล' or similar
  49 |     await expect(adminModalTitle).toBeVisible({ timeout: 5000 });
  50 |   });
  51 | });
  52 | 
```