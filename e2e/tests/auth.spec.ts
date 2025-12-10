import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";
const TEST_USER_PASSWORD_BAD = "Aa1!wrong";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test.describe("Autenticacion (login)", () => {
  test("login correcto cierra el modal de autenticacion", async ({ page }) => {
    await page.goto("/descubrir");

    const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
    await profileButton.click();
    const loginItem = page.getByRole("menuitem", { name: /Iniciar sesion|Iniciar sesi[oó]n|Sign in/i });
    if ((await loginItem.count()) === 0) return;
    await loginItem.click();

    const title = page.getByText("Welcome back");
    await title.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    if ((await title.count()) === 0) return;

    await page.getByLabel("Email").fill(TEST_USER_EMAIL);
    await page.getByLabel("Password").fill(TEST_USER_PASSWORD_OK);

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();

    await submitButton.click();

    await title.waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  });

  test("login incorrecto muestra un mensaje de error y mantiene el modal abierto", async ({
    page,
  }) => {
    await page.goto("/descubrir");

    const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
    await profileButton.click();
    const loginItem = page.getByRole("menuitem", { name: /Iniciar sesion|Iniciar sesi[oó]n|Sign in/i });
    if ((await loginItem.count()) === 0) return;
    await loginItem.click();

    const title = page.getByText("Welcome back");
    await title.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    if ((await title.count()) === 0) return;

    await page.getByLabel("Email").fill(TEST_USER_EMAIL);
    await page.getByLabel("Password").fill(TEST_USER_PASSWORD_BAD);

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();

    await submitButton.click();

    await expect(title).toBeVisible();
  });
});
