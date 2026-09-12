import { test, expect } from '@playwright/test';
import { AuthService } from './services/authservice';

// Создаем отдельного юзера для тестов профиля, чтобы избежать конфликтов при параллельном запуске
const PROFILE_USER = {
  name: 'Valery',
  surname: 'Zhmyshenko', 
  email: `gladiator_${Date.now()}@gmail.com`,
  password: 'ProfilePassword123!'
};

test.describe('Профиль пользователя', () => {

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await AuthService.register(page, {
      name: PROFILE_USER.name,
      surname: PROFILE_USER.surname,
      email: PROFILE_USER.email,
      password: PROFILE_USER.password
    });
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await AuthService.login(page, PROFILE_USER.email, PROFILE_USER.password);
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await page.goto('/profile');
  });

  test('Данные в профиле полностью совпадают с регистрационными [Средний]', async ({ page }) => {

    const nameParagraph = page.locator('p').filter({ hasText: /^Name:/ });
    await expect(nameParagraph).toHaveText(`Name: ${PROFILE_USER.name}`);  

    const surnameParagraph = page.locator('p').filter({ hasText: /^Surname:/ });
    await expect(surnameParagraph).toHaveText(`Surname: ${PROFILE_USER.surname}`); 

    const mailParagraph = page.locator('p').filter({ hasText: /^Email:/ });
    await expect(mailParagraph).toHaveText(`Email: ${PROFILE_USER.email}`);
  });

  test('После перезагрузки страницы данные профиля сохраняются [Средний]', async ({ page }) => {
    const nameParagraph = page.locator('p').filter({ hasText: /^Name:/ });
    const surnameParagraph = page.locator('p').filter({ hasText: /^Surname:/ });
    const mailParagraph = page.locator('p').filter({ hasText: /^Email:/ });

    await expect(nameParagraph).toHaveText(`Name: ${PROFILE_USER.name}`);
    await expect(surnameParagraph).toHaveText(`Surname: ${PROFILE_USER.surname}`);
    await expect(mailParagraph).toHaveText(`Email: ${PROFILE_USER.email}`);

    await page.reload();
    await expect(page).toHaveURL('/profile');

    await expect(nameParagraph).toHaveText(`Name: ${PROFILE_USER.name}`);
    await expect(surnameParagraph).toHaveText(`Surname: ${PROFILE_USER.surname}`);
    await expect(mailParagraph).toHaveText(`Email: ${PROFILE_USER.email}`);
  }); 
});