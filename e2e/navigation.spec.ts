import { test, expect } from '@playwright/test';

/**
 * E2E Tests for the Ifrit Application
 * 
 * Tests the critical user journeys including domain hunting
 * and website creation flows.
 */

test.describe('Hunt Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display Hunt tab and navigate to it', async ({ page }) => {
        // Look for Hunt tab
        const huntTab = page.locator('text=Hunt');
        await expect(huntTab).toBeVisible();

        // Click Hunt tab
        await huntTab.click();

        // Should show domain hunting UI
        await expect(page.locator('text=Domain')).toBeVisible();
    });

    test('should display Domain Sources component', async ({ page }) => {
        // Navigate to Hunt tab
        await page.click('text=Hunt');

        // Navigate to Domain Domination if it's a subtab
        const domainTab = page.locator('text=Domain');
        if (await domainTab.isVisible()) {
            await domainTab.click();
        }

        // Should see the three import columns
        await expect(page.locator('text=Discovery Import')).toBeVisible();
        await expect(page.locator('text=Free Scraping')).toBeVisible();
    });

    test('should have SpamZilla CSV import button', async ({ page }) => {
        await page.click('text=Hunt');

        // Look for SpamZilla import
        const importButton = page.locator('text=Import SpamZilla CSV');
        await expect(importButton).toBeVisible();
    });
});

test.describe('Websites Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display Websites tab', async ({ page }) => {
        const websitesTab = page.locator('text=Websites');
        await expect(websitesTab).toBeVisible();
    });

    test('should navigate to Websites tab', async ({ page }) => {
        await page.click('text=Websites');

        // Should show websites UI
        await expect(page.locator('text=Create')).toBeVisible();
    });
});

test.describe('Settings Tab', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display Settings tab', async ({ page }) => {
        const settingsTab = page.locator('text=Settings');
        await expect(settingsTab).toBeVisible();
    });

    test('should navigate to Settings tab', async ({ page }) => {
        await page.click('text=Settings');

        // Should show settings UI
        await expect(page.locator('text=Integration')).toBeVisible();
    });
});
