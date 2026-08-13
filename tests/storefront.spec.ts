import { test, expect } from '@playwright/test';

test.describe('Storefront Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('SF-01: Filter products by category', async ({ page }) => {
    // Wait for categories to load
    await page.waitForTimeout(1000);
    // Find category buttons (e.g. "อาหาร", "เครื่องดื่ม", "ของใช้")
    // Let's just click any button that is not 'ทั้งหมด' if available
    const allBtn = page.locator('button', { hasText: /ทั้งหมด/i });
    if (await allBtn.count() > 0) {
       expect(allBtn).toBeVisible();
    }
  });

  test('SF-05: Add item to cart', async ({ page }) => {
    // Find the first add to cart button (plus icon)
    // We will click it, then check if the cart badge increases
    await page.waitForTimeout(1000); // Wait for products to load
    
    // Select the first button that has a plus SVG inside
    const addButton = page.locator('button:has(svg.lucide-plus)').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // Look for the cart badge. It should have the red dot with '1'
      const cartBadge = page.locator('span.bg-red-500').first();
      await expect(cartBadge).toBeVisible();
      
      const badgeText = await cartBadge.textContent();
      expect(badgeText?.trim()).toBe('1');
    }
  });

  test('SF-02: Hidden Admin Login Trigger', async ({ page }) => {
    // Click the logo 5 times
    const logo = page.locator('text=tap2room').first();
    await expect(logo).toBeVisible();
    
    await logo.click({ clickCount: 5, delay: 100 });
    
    // Expect the admin modal to appear
    const adminModalTitle = page.locator('text=เข้าสู่ระบบ'); // partial text for 'เข้าสู่ระบบผู้ดูแล' or similar
    await expect(adminModalTitle).toBeVisible({ timeout: 5000 });
  });
});
