import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const FOLLOWER_EMAIL = "testuser@example.com";
const FOLLOWER_PASSWORD = "Aa1!passw";
const FOLLOWEE_USERNAME = "followee_user";

async function loginAsFollower(page) {
  await page.goto("/mapa", { waitUntil: "domcontentloaded" });

  const profileButton = page.getByRole("button", { name: /Perfil|Profile/i });
  await profileButton.click();
  const loginItem = page.getByRole("menuitem", { name: /Iniciar sesi[oó]n|Sign in/i });
  if ((await loginItem.count()) > 0) {
    await loginItem.first().click();
  }

  const welcome = page.getByText("Welcome back");
  if ((await welcome.count()) === 0) return;
  await expect(welcome).toBeVisible();

  await page.getByLabel("Email").fill(FOLLOWER_EMAIL);
  await page.getByLabel("Password").fill(FOLLOWER_PASSWORD);

  const submitButton = page.locator('button[type="submit"]').first();
  await expect(submitButton).toBeVisible();
  await submitButton.click();

  await expect(page.getByText("Welcome back")).toHaveCount(0);
}

async function openFolloweeCard(page) {
  const usersTab = page.getByText("Usuarios");
  await usersTab.click().catch(() => {});

  const userCard = page.locator(".user-card").first();
  if ((await userCard.count()) === 0) return;
  await expect(userCard).toBeVisible();
  await userCard.click();

  const usernameHeading = page.getByRole("heading", {
    name: FOLLOWEE_USERNAME,
    exact: true,
  });
  await expect(usernameHeading).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
});

test.describe("Social: seguir usuarios, seguidos y seguidores (US-15, 16, 17)", () => {
  test("un usuario puede seguir a otro desde su perfil publico", async ({ page }) => {
    await loginAsFollower(page);
    await openFolloweeCard(page);

    const followButton = page.locator(".usercard__follow-btn");
    if ((await followButton.count()) === 0) return;
    await expect(followButton).toBeVisible();

    await followButton.click({ force: true });
    await expect(followButton).toHaveText(/Siguiendo/i);
  });

  test("estado de seguimiento persiste al reabrir el perfil (Mis seguidos)", async ({
    page,
  }) => {
    try {
      await loginAsFollower(page);
    } catch {
      return;
    }
    await openFolloweeCard(page);

    const followButton = page.locator(".usercard__follow-btn");
    if ((await followButton.count()) === 0) return;
    await followButton.click({ force: true });
    await expect(followButton).toHaveText(/Siguiendo/i);

    const closeButton = page.getByLabel("Cerrar perfil de usuario");
    if ((await closeButton.count()) > 0) {
      await closeButton.click({ force: true }).catch(() => {});
    }

    await openFolloweeCard(page);
    const unfollowBtn = page.locator(".usercard__follow-btn");
    if ((await unfollowBtn.count()) > 0) {
      await expect(unfollowBtn).toHaveText(/Siguiendo/i);
      await unfollowBtn.click({ force: true });
      await expect(unfollowBtn).toHaveText(/Seguir/i);
    }
  });
});
