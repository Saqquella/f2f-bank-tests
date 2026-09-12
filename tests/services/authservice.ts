import { type Page } from '@playwright/test';
import { TestUser } from './userfactory';

export const AuthService = {
  async login(page: Page, email: string, pass: string) {
    await page.goto('/login');
    await page.getByPlaceholder('Type your email').fill(email);
    await page.getByPlaceholder('Type your password').fill(pass);
    const responsePromise = page.waitForResponse(
        response =>
        response.url().includes('/api/auth/login') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Login' }).click();
    return await responsePromise;
  },

  async register(page: Page, profile: TestUser) {
    await page.goto('/register');
    await page.getByPlaceholder('Type your name').fill(profile.name);
    await page.getByPlaceholder('Type your surname').fill(profile.surname);
    await page.getByPlaceholder('Type your email').fill(profile.email);
    await page.locator('input[type="password"]').fill(profile.password);

    const responsePromise = page.waitForResponse(
        response =>
            response.url().includes('/api/auth/register') &&
            response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Register' }).click();
    return await responsePromise;
  }
};