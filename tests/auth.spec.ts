import { test, expect } from '@playwright/test';
import { AuthService } from './services/authservice';

const TEST_USER = {
  name: 'Vitaliy',
  surname: 'Tsal',
  email: `Vitaliy_Tsal${Date.now()}@gmail.com`,
  password: 'Evil_Arthas',
  wrong_password: '87654321'
};

test.describe('Авторизация', () => {
  test.describe.configure({ mode: 'default' });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    const response = await AuthService.register(page, {
      name: TEST_USER.name,
      surname: TEST_USER.surname,
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    expect(response.status()).toBe(201);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Успешная авторизация с валидными данными [ Критический ]', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Type your email' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: 'Type your password' }).fill(TEST_USER.password);

    const loginResponsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/auth/login') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Login' }).click();

    const loginResponse = await loginResponsePromise;
    expect(loginResponse.status()).toBe(200);
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Transfer by phone number')).toBeVisible();
});

  test('Отказ в авторизации с неверным паролем [ Критический ]', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Type your email' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: 'Type your password' }).fill(TEST_USER.wrong_password);
    const responsePromise = page.waitForResponse('**/login');

    await page.getByRole('button', { name: 'Login' }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(401);
    await expect(page.locator('.snackbar.error')).toHaveText('Login failed');
    await expect(page).toHaveURL('/login');
  });
  
  test('Успешный выход из системы (Logout) и уничтожение сессии @security [Высокий]', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Type your email' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: 'Type your password' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('text=Transfer by phone number')).toBeVisible(); 
    await page.locator('button:has(svg)').click(); 
    await expect(page).toHaveURL('/login');
  });

  test('Отправка пустой формы не отправляет запрос на сервер [Средний]', async ({ page }) => {
    const requestPromise = page.waitForRequest('**/login', { timeout: 1500 })
      .catch(() => null);
    await page.getByRole('button', { name: 'Login' }).click();
    const request = await requestPromise;
    expect(request).toBeNull();
    await expect(page).toHaveURL('/login');
  });
 
  test('Введенный пароль скрыт маской (атрибут type="password") [Средний]', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('Type your password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('Успешная авторизация при вводе email с лишними пробелами [Низкий]', async ({ page }) => {
    const emailWithSpaces = `   ${TEST_USER.email}   `;
    await page.getByRole('textbox', { name: 'Type your email' }).fill(emailWithSpaces);
    await page.getByRole('textbox', { name: 'Type your password' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Transfer by phone number')).toBeVisible();
  });

  test('Навигация, работа кнопки "Register page" [ низкий ]', async ({ page }) => {
    await page.getByText('Register page').click();
    await expect(page).toHaveURL('/register');
  });



});
