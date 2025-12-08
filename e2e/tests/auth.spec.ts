import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";
const TEST_USER_PASSWORD_BAD = "Aa1!wrong";

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test.describe("Autenticación (login)", () => {
  test("login correcto cierra el modal de autenticación", async ({ page }) => {
    await page.goto("/descubrir");

    const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
    await profileButton.click();
    await page.getByRole("menuitem", { name: /Iniciar sesión/i }).click();

    const title = page.getByText("Welcome back");
    await expect(title).toBeVisible();

    await page.getByLabel("Email").fill(TEST_USER_EMAIL);
    await page.getByLabel("Password").fill(TEST_USER_PASSWORD_OK);

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();

    await submitButton.click();

    await expect(title).toHaveCount(0);
  });

  test("login incorrecto muestra un mensaje de error y mantiene el modal abierto", async ({
    page,
  }) => {
    await page.goto("/descubrir");

    const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
    await profileButton.click();
    await page.getByRole("menuitem", { name: /Iniciar sesión/i }).click();

    const title = page.getByText("Welcome back");
    await expect(title).toBeVisible();

    await page.getByLabel("Email").fill(TEST_USER_EMAIL);
    await page.getByLabel("Password").fill(TEST_USER_PASSWORD_BAD);

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();

    await submitButton.click();

    const errorAlert = page.locator(".auth__form-error");
    await expect(errorAlert).toContainText(/error|credenciales/i);

    await expect(title).toBeVisible();
  });
});
