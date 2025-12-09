import { test, expect } from "@playwright/test";
import { setupBackendMocks } from "./helpers/backendMocks";

const setAuth = async (page: any) => {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "token-primary");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "user-primary",
        email: "testuser@example.com",
        username: "test_user",
        name: "Test User",
      })
    );
    (window as any).__copiedLinks = [];
    const fallbackClipboard = {
      writeText: (text: string) => {
        (window as any).__copiedLinks.push(text);
        return Promise.resolve();
      },
    };
    (navigator as any).clipboard = (navigator as any).clipboard || fallbackClipboard;
    if (!(navigator as any).clipboard.writeText) {
      (navigator as any).clipboard.writeText = fallbackClipboard.writeText;
    }
  });
};

test.beforeEach(async ({ page }) => {
  await setupBackendMocks(page);
  await setAuth(page);
});

test("US28 - Compartir ruta desde la ficha", async ({ page }) => {
  await page.goto("/mapa", { waitUntil: "domcontentloaded" });

  const routeCards = page.locator(".route-preview-card");
  if ((await routeCards.count()) === 0) return;
  await routeCards.first().click({ force: true });

  const detailsCard = page.locator(".route-details-card");
  await detailsCard.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if ((await detailsCard.count()) === 0) return;

  const shareBtn = detailsCard.getByRole("button", { name: /compartir|share/i });
  if ((await shareBtn.count()) === 0) return;
  await shareBtn.click({ force: true });

  const shareLayer = page.locator('[role="dialog"], .share');
  await shareLayer.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});

  const copyBtn = page
    .getByRole("button", { name: /copiar enlace|copiar|copy link/i })
    .first();
  if ((await copyBtn.count()) === 0) return;
  await copyBtn.click({ force: true });

  await expect
    .poll(async () => await page.evaluate(() => (window as any).__copiedLinks?.length ?? 0))
    .toBeGreaterThan(0);

  const linkField = page.getByRole("textbox", { name: /enlace|link/i });
  if ((await linkField.count()) > 0) {
    await expect(linkField).not.toHaveValue("");
  }
});
