import { test, expect, type Page } from '@playwright/test';
import { AuthService } from './services/authservice';
import { UserFactory } from './services/userfactory';

let transferUser: ReturnType<typeof UserFactory.createUniqueUser>;

async function fillTransferForm(
  page: Page,
  phone: string,
  amount: string,
  purpose = 'Test transfer'
) {
  await page.getByPlaceholder('+7 999 123-45-67').fill(phone);
  await page.getByPlaceholder('0.00').fill(amount);
  await page.getByPlaceholder('e.g. debt repayment').fill(purpose);
}

async function addBalance(page: Page, amount: number) {
  await page.goto('/transactions');

  await page.getByRole('button', { name: 'Add balance' }).click();
  await page.getByPlaceholder('Enter sum').fill(String(amount));

  const responsePromise = page.waitForResponse(
    response =>
      response.url().includes('/api/users/balance/add') &&
      response.request().method() === 'POST'
  );

  await page.getByRole('button', { name: 'Add', exact: true }).click();

  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  await page.goto('/');
  await expect(page.locator('.balance-hint')).toHaveText(`Balance: ${amount}`);
}

test.describe('Модуль переводов', () => {

  test.beforeEach(async ({ page }) => {
    transferUser = UserFactory.createUniqueUser();

    await AuthService.register(page, transferUser);

    await expect(page).toHaveURL('/login');

    await AuthService.login(page, transferUser.email, transferUser.password);
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Transfer by phone number')).toBeVisible();
  });


  test('Перевод блокируется, если номер не начинается с "+" [ Высокий ]', async ({ page }) => {
    await fillTransferForm(page, '79991234567', '100');

    const requestPromise = page
      .waitForRequest(
        request =>
          request.url().includes('/api/users/transfer') &&
          request.method() === 'POST',
        { timeout: 1000 }
      )
      .catch(() => null);

    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.locator('.field-error')).toHaveText(
      'Must start with + and country code. Example: +7 999 123-45-67'
    );

    const request = await requestPromise;
    expect(request).toBeNull();
  });

  test('Номер короче 10 цифр блокируется [ Средний ]', async ({ page }) => {
    await fillTransferForm(page, '+123456789', '100');

    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.locator('.field-error')).toHaveText(
      'Phone must contain 10–15 digits'
    );
  });

  test('Номер длиннее 15 цифр блокируется [ Средний ]', async ({ page }) => {
    await fillTransferForm(page, '+1234567890123456', '100');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('.field-error')).toHaveText('Phone must contain 10–15 digits');
  });

  test('Граничные значения из 10 и 15 цифр принимаются [ Средний ]', async ({ page }) => {
    await addBalance(page, 500);
    await fillTransferForm(page, '+1234567890', '50');// Нижняя граница — 10 цифр.

    let responsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/users/transfer') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Send' }).click();

    let response = await responsePromise;
    expect(response.status()).toBe(200);

    await expect(page.getByText('Transfer completed', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'New transfer' }).click();

    await fillTransferForm(page, '+123456789012345', '50');    // Верхняя граница 15 цифр.

    responsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/users/transfer') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Send' }).click();

    response = await responsePromise;
    expect(response.status()).toBe(200);

    await expect(page.getByText('Transfer completed')).toBeVisible();
  });


  test('Нулевая сумма перевода не отправляется [ Высокий ]', async ({ page }) => {
    await fillTransferForm(page, '+7 999 123-45-67', '0');

    const requestPromise = page
      .waitForRequest(
        request =>
          request.url().includes('/api/users/transfer') &&
          request.method() === 'POST',
        { timeout: 1000 }
      )
      .catch(() => null);

    await page.getByRole('button', { name: 'Send' }).click();

    const request = await requestPromise;

    expect(request).toBeNull();
    await expect(page.getByText('Transfer by phone number')).toBeVisible();
  });


  test('Отрицательная сумма перевода блокируется [ Высокий ]', async ({ page }) => {
    await fillTransferForm(page, '+7 999 123-45-67', '-100');

    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.locator('.snackbar')).toContainText('Amount must be greater than zero');
  });


  test('Перевод при нулевом балансе блокируется [ Критический ]', async ({ page }) => {
    await fillTransferForm(page, '+7 999 123-45-67', '100');

    const responsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/users/transfer') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Send' }).click();

    const response = await responsePromise;

    expect(response.status()).toBe(400);

    await expect(page.locator('.snackbar')).toContainText('Transfer failed. Check your balance.');

    await expect(page.locator('.balance-hint')).toHaveText('Balance: 0');
  });


  test('Перевод суммы больше доступного баланса блокируется [Критический]', async ({ page }) => {
    await addBalance(page, 100);

    await fillTransferForm(page, '+7 999 123-45-67', '101');

    const responsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/users/transfer') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Send' }).click();

    const response = await responsePromise;

    expect(response.status()).toBe(400);

    await expect(page.locator('.snackbar')).toContainText('Transfer failed. Check your balance.');

    // Неуспешный перевод не должен изменить баланс.
    await expect(page.locator('.balance-hint')).toHaveText('Balance: 100');
  });


  test('Успешный перевод уменьшает баланс и появляется в истории [ Критический ]', async ({ page }) => {
    await addBalance(page, 500);

    await fillTransferForm(
      page,
      '+7 (999) 123-45-67',
      '125',
      'E2E transfer'
    );

    const responsePromise = page.waitForResponse(
      response =>
        response.url().includes('/api/users/transfer') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Send' }).click();

    const response = await responsePromise;

    expect(response.status()).toBe(200);

    await expect(page.getByText('Transfer completed',{ exact: true })).toBeVisible();

    await expect(page.locator('.balance-hint')).toHaveText('Balance: 375');
    await page.goto('/transactions');

    const withdrawalRow = page
      .locator('tbody tr')
      .filter({ hasText: 'withdrawal' })
      .filter({ hasText: '125' });

    await expect(withdrawalRow).toBeVisible();
  });

  test('Cancel очищает заполненную форму [ Низкий ]', async ({ page }) => {
    const phoneInput = page.getByPlaceholder('+7 999 123-45-67');
    const amountInput = page.getByPlaceholder('0.00');
    const purposeInput = page.getByPlaceholder('e.g. debt repayment');

    await phoneInput.fill('+7 999 123-45-67');
    await amountInput.fill('100');
    await purposeInput.fill('Test transfer');

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(phoneInput).toHaveValue('');
    await expect(amountInput).toHaveValue('');
    await expect(purposeInput).toHaveValue('');
  });

});