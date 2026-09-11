import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: 'User1@gmail.com', // Используем твоего юзера
  password: '12345678',
  wrong_password: '87654321'
};

test.describe('Авторизация', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost/login');
  });

  test('Успешная авторизация с валидными данными [ Критический ]', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Type your email' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: 'Type your password' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    // Проверка уникального элемента UI, мб найти устойчивее
    await expect(page.locator('text=Transfer by phone number')).toBeVisible();
  });

  test('Отказ в авторизации с неверным паролем [ Критический ]', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Type your email' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: 'Type your password' }).fill(TEST_USER.wrong_password);
    const responsePromise = page.waitForResponse('**/login');

    await page.getByRole('button', { name: 'Login' }).click();
    // проверка появления ошибки
    const response = await responsePromise;
    expect(response.status()).toBe(401);
    await expect(page.locator('.snackbar.error')).toHaveText('Login failed');
    await expect(page).toHaveURL('/login');
    // await expect(page.locator('Login Failed')).toBeVisible();
  });
  
  test('Успешный выход из системы (Logout) и уничтожение сессии @security [Высокий]', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Type your email' }).fill(TEST_USER.email);
    await page.getByRole('textbox', { name: 'Type your password' }).fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('text=Transfer by phone number')).toBeVisible(); // login
    await page.locator('button:has(svg)').click(); // logout
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
    // Если приложение правильно обрабатывает данные, нас успешно пустит внутрь
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Transfer by phone number')).toBeVisible();
  });

  test('Навигация, работа кнопки "Register page" [ низкий ]', async ({ page }) => {
    await page.getByText('Register page').click();
    await expect(page).toHaveURL('/register');
  });



});

  // test('Защита от SQL-инъекций в поле email @security [Критический]', async ({ page }) => {
  //   const sqliPayload = "' OR 1=1 --@example.com";
  //   await page.getByRole('textbox', { name: 'Type your email' }).fill(sqliPayload);
  //   await page.getByRole('textbox', { name: 'Type your password' }).fill('random_password');
  //   const responsePromise = page.waitForResponse('/login');
  //   await page.getByRole('button', { name: 'Login' }).click();
  //   const response = await responsePromise;
  //   expect(response.status()).toBe(401);
  //   await expect(page).toHaveURL('/login');
  // });


// test('Аутентификация с валидными данными [ Критический ]', async ({ page }) => {
//   await page.goto('http://localhost/login');
//   await page.getByRole('textbox', { name: 'Type your email' }).click();
//   await page.getByRole('textbox', { name: 'Type your email' }).fill('User1@gmail.com');
//   await page.getByRole('textbox', { name: 'Type your password' }).click();
//   await page.getByRole('textbox', { name: 'Type your password' }).fill('12345678');
//   await page.getByRole('button', { name: 'Login' }).click();
//   await expect(page.locator('text=Transfer by phone number')).toBeVisible();


  //   await expect(page).toHaveURL('/');


//   await expect(page).toHaveURL('http://localhost/');
//   await expect(page.locator('text=Balance')).toBeVisible();
//   await expect(page).toHaveURL('http://localhost/');
//   await expect(page.locator('text=Balance')).toBeVisible();
// });