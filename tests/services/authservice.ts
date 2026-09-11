import { type Page } from '@playwright/test';
import { UserFactory, TestUser } from './userfactory';

export const AuthService = {
  // 1. Функция входа
  async login(page: Page, email: string, pass: string) {
    await page.goto('/login');
    await page.getByPlaceholder('Type your email').fill(email);
    await page.getByPlaceholder('Type your password').fill(pass);
    await page.getByRole('button', { name: 'Login' }).click();
  },

  // 2. Функция регистрации
  async register(page: Page, profile: TestUser) {
    await page.goto('/register');
    await page.getByPlaceholder('Type your name').fill(profile.name);
    await page.getByPlaceholder('Type your surname').fill(profile.surname);
    await page.getByPlaceholder('Type your email').fill(profile.email);
    await page.locator('input[type="password"]').fill(profile.password);
    await page.getByRole('button', { name: 'Register' }).click();
  }
};