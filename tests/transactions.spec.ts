import { test, expect, type Page } from '@playwright/test';
import { AuthService } from './services/authservice';
import { UserFactory } from './services/userfactory';


async function openBalanceModal(page: Page) {
  await page.getByRole('button', { name: 'Add balance' }).click();

  await expect(page.getByRole('heading', { name: 'Add balance' })).toBeVisible();
}

test.describe('Модуль транзакций', () => {

  test.beforeEach(async ({ page }) => {
    const user = UserFactory.createUniqueUser();

    await AuthService.register(page, user);
    await expect(page).toHaveURL('/login');

    await AuthService.login(page, user.email, user.password);
    await expect(page).toHaveURL('/');
    await page.goto('/transactions');
    await expect(page).toHaveURL('/transactions');
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    await expect(page.getByText('No transactions yet')).toBeVisible();
  });


  test('Успешное пополнение увеличивает баланс и появляется в истории [Критический]', async ({ page }) => {
    await openBalanceModal(page);

    await page
      .getByPlaceholder('Enter sum')
      .fill('100');

    const responsePromise = page.waitForResponse(
      response =>
        response.url().includes('/users/balance/add') &&
        response.request().method() === 'POST'
    );

    await page
      .getByRole('button', { name: 'Add', exact: true })
      .click();

    const response = await responsePromise;

    expect(response.ok()).toBeTruthy();

    await expect(page.getByText('Balance: 100', { exact: true })).toBeVisible();
    await expect(page.getByText('No transactions yet')).not.toBeVisible();

    const transactionRow = page
      .locator('tbody tr')
      .filter({ hasText: 'deposit' })
      .filter({ hasText: '100' });

    await expect(transactionRow).toBeVisible();
    await expect(transactionRow).toContainText('completed');
  });


  test('Пополнение на сумму 0 блокируется [Высокий]', async ({ page }) => {
    await openBalanceModal(page);

    await page
      .getByPlaceholder('Enter sum')
      .fill('0');

    const requestPromise = page
      .waitForRequest(
        request =>
          request.url().includes('/users/balance/add') &&
          request.method() === 'POST',
        { timeout: 1000 }
      )
      .catch(() => null);

    await page
      .getByRole('button', { name: 'Add', exact: true })
      .click();

    const request = await requestPromise;

    expect(request).toBeNull();

    await expect(page.getByRole('heading', { name: 'Add balance' })).toBeVisible();
    await expect(page.getByText('Balance: 0', { exact: true })).toBeVisible();
    await expect(page.getByText('No transactions yet')).toBeVisible();
  });


  test('Отрицательная сумма пополнения блокируется [Высокий]', async ({ page }) => {
    await openBalanceModal(page);

    await page
      .getByPlaceholder('Enter sum')
      .fill('-100');

    const requestPromise = page
      .waitForRequest(
        request =>
          request.url().includes('/users/balance/add') &&
          request.method() === 'POST',
        { timeout: 1000 }
      )
      .catch(() => null);

    await page
      .getByRole('button', { name: 'Add', exact: true })
      .click();

    const request = await requestPromise;

    expect(request).toBeNull();

    await expect(page.getByRole('heading', { name: 'Add balance' })).toBeVisible();
    await expect(page.getByText('Balance: 0', { exact: true })).toBeVisible();
    await expect(page.getByText('No transactions yet')).toBeVisible();
  });

  test('Cancel отменяет пополнение и очищает введённую сумму [Низкий]', async ({ page }) => {
    await openBalanceModal(page);

    const amountInput = page.getByPlaceholder('Enter sum');

    await amountInput.fill('100');
    await page
      .getByRole('button', { name: 'Cancel' })
      .click();

    await expect(page.getByRole('heading', { name: 'Add balance' })).not.toBeVisible();
    await expect(page.getByText('Balance: 0', { exact: true })).toBeVisible();
    await expect(page.getByText('No transactions yet')).toBeVisible();
    await openBalanceModal(page);
    await expect(page.getByPlaceholder('Enter sum')).toHaveValue('');
  });

  test.fixme('BUG-007: колонки тип и статус в transactions отображаются правильно [Средний]',async ({ page }) => {
    const row = page.locator('tbody tr').first();
    const cells = row.locator('td');
    await expect(cells.nth(2)).toHaveText('deposit');
    await expect(cells.nth(3)).toHaveText('completed');
  });

});