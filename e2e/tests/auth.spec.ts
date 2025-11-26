// e2e/tests/auth.spec.ts
import { test, expect } from "@playwright/test";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "password123";
const TEST_USER_PASSWORD_BAD = "wrong-password";

test.describe("Autenticación (login)", () => {
  test("login correcto cierra el modal de autenticación", async ({ page }) => {
    await page.goto("/");

    // Abrimos el modal de login desde el botón de perfil
    const profileButton = page.getByRole("button", { name: "Profile" });
    await profileButton.click();

    // AuthCard en modo login
    const title = page.getByText("Welcome back");
    await expect(title).toBeVisible();

    // Rellenamos el formulario
    await page.getByLabel("Email").fill(TEST_USER_EMAIL);
    await page.getByLabel("Password").fill(TEST_USER_PASSWORD_OK);

    // Botón de envío: buscamos por type="submit" en el formulario
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();

    await submitButton.click();

    // Esperamos a que el modal se cierre:
    // el texto "Welcome back" debe desaparecer de la pantalla
    await expect(title).toHaveCount(0);
  });

  test("login incorrecto muestra un mensaje de error y mantiene el modal abierto", async ({
    page,
  }) => {
    await page.goto("/");

    const profileButton = page.getByRole("button", { name: "Profile" });
    await profileButton.click();

    const title = page.getByText("Welcome back");
    await expect(title).toBeVisible();

    await page.getByLabel("Email").fill(TEST_USER_EMAIL);
    await page.getByLabel("Password").fill(TEST_USER_PASSWORD_BAD);

    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();

    await submitButton.click();

    // Hay un <p role="alert"> cuando hay error en el formulario
    const errorAlert = page.getByRole("alert");
    await expect(errorAlert).toBeVisible();

    // El modal sigue abierto (no se ha hecho login)
    await expect(title).toBeVisible();
  });
});
