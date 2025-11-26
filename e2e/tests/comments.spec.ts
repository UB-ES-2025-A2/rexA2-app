// e2e/tests/comments.spec.ts
import { test, expect } from "@playwright/test";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "password123";

async function login(page) {
  await page.goto("/");

  const profileButton = page.getByRole("button", { name: "Profile" });
  await profileButton.click();

  await expect(page.getByText("Welcome back")).toBeVisible();

  await page.getByLabel("Email").fill(TEST_USER_EMAIL);
  await page.getByLabel("Password").fill(TEST_USER_PASSWORD_OK);

  // Botón submit genérico
  const submitButton = page.locator('button[type="submit"]').first();
  await expect(submitButton).toBeVisible();
  await submitButton.click();

  await page.waitForTimeout(1000);
}

test.describe("Comentarios en rutas (US-18 y US-19)", () => {
  test("un usuario autenticado puede añadir un comentario y verlo en la lista", async ({
    page,
  }) => {
    await login(page);

    // Vamos a la home y abrimos la primera ruta disponible
    await page.goto("/");

    const routeRows = page.locator(".route-row");
    const count = await routeRows.count();

    if (count === 0) {
      test.skip(true, "No hay rutas disponibles para probar comentarios");
    }

    await routeRows.first().click();

    await page.waitForTimeout(1000);

    const commentInput = page.locator("textarea").first();
    await expect(commentInput).toBeVisible();

    const commentText = `Comentario E2E ${Date.now()}`;

    await commentInput.fill(commentText);

    const publishButton = page.getByRole("button", { name: /publicar/i });
    await publishButton.click();

    const newComment = page.getByText(commentText);
    await expect(newComment).toBeVisible();
  });
});
