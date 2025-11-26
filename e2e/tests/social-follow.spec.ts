import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const FOLLOWER_EMAIL = "testuser@example.com";
const FOLLOWER_PASSWORD = "Aa1!passw";
const FOLLOWEE_USERNAME = "followee_user";

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

  await expect(page.getByText("Welcome back")).toHaveCount(0);
}

async function openFolloweeCard(page) {
  const usersTab = page.getByText("Usuarios");
  await usersTab.click();

  const userCard = page.locator(".user-card").first();
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
  test("un usuario puede seguir a otro desde su perfil público", async ({
    page,
  }) => {
    await loginAsFollower(page);
    await openFolloweeCard(page);

    const followButton = page.locator(".usercard__follow-btn");
    await expect(followButton).toBeVisible();

    await followButton.click();
    await expect(followButton).toHaveText(/Siguiendo/i);
  });

  test("estado de seguimiento persiste al reabrir el perfil (Mis seguidos)", async ({
    page,
  }) => {
    await loginAsFollower(page);
    await openFolloweeCard(page);

    const followButton = page.locator(".usercard__follow-btn");
    await followButton.click();
    await expect(followButton).toHaveText(/Siguiendo/i);

    const closeButton = page.getByLabel("Cerrar perfil de usuario");
    await closeButton.click();

    await openFolloweeCard(page);
    await expect(page.locator(".usercard__follow-btn")).toHaveText(/Siguiendo/i);

    const unfollowBtn = page.locator(".usercard__follow-btn");
    await unfollowBtn.click();
    await expect(unfollowBtn).toHaveText(/Seguir/i);
  });
});
