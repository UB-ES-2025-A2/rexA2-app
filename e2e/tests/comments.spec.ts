// e2e/tests/comments.spec.ts
import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const TEST_USER_EMAIL = "testuser@example.com";
const TEST_USER_PASSWORD_OK = "Aa1!passw";

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

  await expect(page.getByText("Welcome back")).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test.describe("Comentarios en rutas (US-18 y US-19)", () => {
  test.skip("un usuario autenticado puede añadir un comentario y verlo en la lista", async ({
    page,
  }) => {
    await login(page);

    // Abre la pestaña de usuarios y entra en el perfil del followee con rutas
    const usersTab = page.getByText("Usuarios");
    await usersTab.click();

    const userCard = page.locator(".user-card").first();
    await expect(userCard).toBeVisible({ timeout: 10_000 });
    await userCard.click();

    // Dentro del perfil, selecciona la primera ruta
    const userRouteCard = page.locator(".usercard__routes .route-preview-card").first();
    await expect(userRouteCard).toBeVisible({ timeout: 10_000 });
    await userRouteCard.click();

    const routeDetails = page.locator(".route-details-card");
    await expect(routeDetails).toBeVisible({ timeout: 10_000 });

    const commentButton = page.getByTitle("Ver comentarios");
    await commentButton.click();

    const commentInput = page.getByPlaceholder("Escribe un comentario...");
    await expect(commentInput).toBeVisible();

    const commentText = `Comentario E2E ${Date.now()}`;

    await commentInput.fill(commentText);

    const publishButton = page.getByRole("button", { name: /enviar/i });
    await publishButton.click();

    const newComment = page.getByText(commentText);
    await expect(newComment).toBeVisible();
  });
});
