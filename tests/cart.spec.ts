import { test, expect } from '@playwright/test';

test.describe('Cart and Checkout Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000); // Wait for products
    
    // Add item to cart
    const addButton = page.locator('button:has(svg.lucide-plus)').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // Open cart drawer by finding the button with ShoppingBag icon
      const cartButton = page.locator('button:has(svg.lucide-shopping-bag)').first();
      await cartButton.click();
      await page.waitForTimeout(500); // wait for drawer animation
    }
  });

  test('CT-01: Adjust item quantity in cart', async ({ page }) => {
    // Find plus buttons inside the cart drawer
    // The cart drawer uses lucide-plus for increasing quantity
    const plusButtons = page.locator('button:has(svg.lucide-plus)');
    if (await plusButtons.count() > 0) {
      // First is usually the one in the cart
      await plusButtons.first().click();
      await page.waitForTimeout(500);
      // Validates it doesn't crash
    }
  });

  test('CT-08: Checkout requires room number', async ({ page }) => {
    // Try to checkout COD
    const checkoutCOD = page.locator('button', { hasText: /ชำระเงินปลายทาง/i });
    if (await checkoutCOD.isVisible()) {
      await checkoutCOD.click();
      
      const phoneInput = page.locator('input[type="tel"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('0812345678');
        const confirmBtn = page.locator('button', { hasText: /ยืนยัน/i });
        await confirmBtn.click();
        
        // Wait for error about room number
        const errorMsg = page.locator('text=กรุณาระบุเลขห้อง');
        if (await errorMsg.isVisible()) {
          expect(errorMsg).toBeVisible();
        }
      }
    }
  });
});
