import { test, expect } from '@playwright/test';
import { AuthService } from './services/authservice';
import { UserFactory } from './services/userfactory';

test.describe('Регистрация', () => {
  let newUser: ReturnType<typeof UserFactory.createUniqueUser>;

  test.beforeEach(async ({ page }) => {
    newUser = UserFactory.createUniqueUser();
  });

  test('Успешная регистрация с валидными данными [ Критический ]', async ({ page }) => {
    await AuthService.register(page, newUser);

    await expect(page).toHaveURL('/login');
    await expect(page.locator('.snackbar.success')).toHaveText('Registration successful! Please log in.');
  });

  test('Отказ при регистрации с уже использованной почтой [ Высокий ]', async ({ page }) => {
    await AuthService.register(page, newUser);
    await expect(page).toHaveURL('/login');

    await AuthService.register(page, newUser); 

    await expect(page.locator('.error')).toHaveText('User with this email already exists');
    await expect(page).toHaveURL('/register'); 
  });

  test('Поле ввода имени не обрабатывает SQL-like символы @security [Высокий]', async ({ page }) => {
    newUser.name = "Dmitry'; DROP TABLE users; --"; 

    const responsePromise = page.waitForResponse('/register');
    await AuthService.register(page, newUser);
    const response = await responsePromise;
    expect(response.status()).not.toBe(500);
  });

  test('Отправка пустой формы блокируется фронтендом [Средний]', async ({ page }) => {
    await page.goto('/register');
    const requestPromise = page.waitForRequest('**/register', { timeout: 1000 }).catch(() => null);
    await page.getByRole('button', { name: 'Register' }).click();
    const request = await requestPromise;
    
    expect(request).toBeNull(); 
    await expect(page).toHaveURL('/register');
  });

  test('Отказ при вводе некорректного формата email [Средний]', async ({ page }) => {
    await page.goto('/register');

    await page.getByPlaceholder('Type your name').fill('Vitaliy');
    await page.getByPlaceholder('Type your surname').fill('Tsal');
    await page.getByPlaceholder('Type your email').fill('invalid-email-format.com');
    await page.locator('input[type="password"]').fill('ValidPass123');

    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL('/register');
  });

  test.fixme('Отказ при вводе пробелов вместо данных (БАГ ФРОНТЕНДА) [Средний]', async ({ page }) => {
    await page.goto('/register');
    
    await page.getByPlaceholder('Type your name').fill('   ');
    await page.getByPlaceholder('Type your surname').fill('   ');
    await page.getByPlaceholder('Type your email').fill(`spaces_${Date.now()}@example.com`);
    await page.locator('input[type="password"]').fill('   '); 
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('После успешной регистрации пользователь может авторизоваться [Критический]', async ({ page }) => {
    await AuthService.register(page, newUser);

    await expect(page).toHaveURL('/login');
    await expect(page.locator('.snackbar.success')).toHaveText('Registration successful! Please log in.');

    await AuthService.login(
        page,
        newUser.email,
        newUser.password
    );
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Transfer by phone number')).toBeVisible();
  });
});