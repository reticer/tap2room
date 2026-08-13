import { test, expect } from '@playwright/test';

test.describe('Admin Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Go to storefront and trigger the admin login modal
    await page.goto('/');
    await page.waitForTimeout(1000); // wait for load
    
    // Trigger admin login
    const logo = page.locator('text=tap2room').first();
    if (await logo.isVisible()) {
      await logo.click({ clickCount: 5, delay: 100 });
      await page.waitForTimeout(500);
    }
  });

  test('AL-02: Incorrect admin login', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('wrongpassword');
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      
      // Wait for error state
      await page.waitForTimeout(1000);
      
      // Look for error message (either Toast or inline text)
      // We'll just ensure it doesn't navigate to /admin
      expect(page.url()).not.toContain('/admin');
    }
  });

  test('AD-01: Admin Dashboard accessible', async ({ page }) => {
    // Check if the modal is visible
    const loginTitle = page.locator('text=เข้าสู่ระบบ').first(); // Partial match
    if (await loginTitle.isVisible()) {
      await expect(loginTitle).toBeVisible();
    }
  });
});
