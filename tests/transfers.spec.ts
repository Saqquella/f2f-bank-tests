import { test, expect } from '@playwright/test';
import { AuthService } from './services/authservice';
import { UserFactory } from './services/userfactory';

test.describe('Модуль переводов', () => {
  let transferUser: ReturnType<typeof UserFactory.createUniqueUser>;

  test.beforeEach(async ({ page }) => {
    // Полная изоляция: новый пользователь для каждого теста
    transferUser = UserFactory.createUniqueUser();
    await AuthService.register(page, transferUser);
    await AuthService.login(page, transferUser.email, transferUser.password);

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Transfer by phone number')).toBeVisible();
  });

  test('Валидный номер телефона (с пробелами и дефисами) принимается', async ({ page }) => {
    await page.getByPlaceholder('+7 999 123-45-67').fill('+7 999 123-45-67');
    await page.getByPlaceholder('+7 999 123-45-67').blur();
    
    await expect(page.getByText('Must start with + and country code')).not.toBeVisible();
  });

  test('Перевод блокируется, если номер не начинается с "+"', async ({ page }) => {
    await page.getByPlaceholder('+7 999 123-45-67').fill('7 999 123-45-67');
    await page.getByText('Transfer by phone number').click();
    
    await expect(page.getByText('Must start with + and country code')).toBeVisible();
  });

  test('Сумма перевода строго больше нуля (проверка 0)', async ({ page }) => {
    await page.getByPlaceholder('+7 999 123-45-67').fill('+79991234567');
    await page.getByPlaceholder('0.00').fill('0');
    await page.getByPlaceholder('e.g. debt repayment').fill('QA Test');

    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Amount must be greater than zero')).toBeVisible();
  });

  test('Блокировка перевода при нулевом балансе с проверкой HTTP статуса', async ({ page }) => {
    await page.getByPlaceholder('+7 999 123-45-67').fill('+79991234567');
    await page.getByPlaceholder('0.00').fill('100');
    await page.getByPlaceholder('e.g. debt repayment').fill('Zero balance test');

    // Ожидаем ответ от бекенда для проверки бизнес-логики сервера
    const responsePromise = page.waitForResponse('**/users/transfer');
    await page.getByRole('button', { name: 'Send' }).click();
    const response = await responsePromise;

    // Проверяем, что бекенд честно отбил запрос со статусом 400
    expect(response.status()).toBe(400);
    await expect(page.getByText('Transfer failed. Check your balance.')).toBeVisible();
  });
});