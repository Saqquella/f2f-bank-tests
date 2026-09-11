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

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('.snackbar.success')).toHaveText('Registration successful! Please log in.');
  });

  test('Отказ при регистрации с уже использованной почтой [ Высокий ]', async ({ page }) => {
    // 1. Создаем пользователя первый раз
    await AuthService.register(page, newUser);
    await expect(page).toHaveURL('/login');

    // 2. Пытаемся зарегистрировать те же самые данные второй раз
    await AuthService.register(page, newUser);
    
    // Ожидаем появление ошибки дубликата
    await expect(page.locator('.error')).toHaveText('User with this email already exists');
    await expect(page).toHaveURL('/register');
  });


});