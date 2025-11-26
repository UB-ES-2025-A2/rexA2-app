// e2e/tests/social-follow.spec.ts
import { test, expect } from "@playwright/test";

const FOLLOWER_EMAIL = "follower@example.com";
const FOLLOWER_PASSWORD = "password123";

const FOLLOWEE_USERNAME = "followee_user"; // ajusta a un username real

async function loginAsFollower(page) {
  await page.goto("/");

  const profileButton = page.getByRole("button", { name: "Profile" });
  await profileButton.click();

  await expect(page.getByText("Welcome back")).toBeVisible();

  await page.getByLabel("Email").fill(FOLLOWER_EMAIL);
  await page.getByLabel("Password").fill(FOLLOWER_PASSWORD);

  const submitButton = page.locator('button[type="submit"]').first();
  await expect(submitButton).toBeVisible();
  await submitButton.click();

  await page.waitForTimeout(1000);
}

test.describe("Social: seguir usuarios, seguidos y seguidores (US-15, 16, 17)", () => {
  test("un usuario puede seguir a otro desde su perfil público", async ({
    page,
  }) => {
    await loginAsFollower(page);

    // A partir de aquí irá el flujo de buscar usuario y seguir, que ajustaremos
    // cuando tengamos claro cómo es exactamente la UI
    // (lo importante ahora es que el login funcione).
  });

  test("los seguidos aparecen en la lista de 'Mis seguidos' (US-17)", async ({
    page,
  }) => {
    await loginAsFollower(page);

    // Aquí después haremos el flujo de ir a /perfil y comprobar "Seguidos"
    // por ahora nos centramos en que el login no reviente.
  });
});
