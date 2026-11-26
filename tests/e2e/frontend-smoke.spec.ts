import { expect, test } from "@playwright/test";

type AssetResponse = {
  url: string;
  status: number;
  resourceType: string;
  contentType: string;
  bodyPrefix: string;
};

test("sign-in renders with valid assets through direct, reload, and client navigation", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const runtimeErrors: string[] = [];
  const failedStaticRequests: string[] = [];
  const assetResponses: Promise<AssetResponse>[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).pathname.startsWith("/_next/static/")) {
      failedStaticRequests.push(
        `${request.url()}: ${request.failure()?.errorText ?? "failed"}`,
      );
    }
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/_next/static/")) return;
    assetResponses.push(
      (async () => {
        const [contentType, body] = await Promise.all([
          response.headerValue("content-type"),
          response.body(),
        ]);
        return {
          url: response.url(),
          status: response.status(),
          resourceType: response.request().resourceType(),
          contentType: contentType ?? "",
          bodyPrefix: body.toString("utf8", 0, 200),
        };
      })(),
    );
  });

  const response = await page.goto("/sign-in", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Sign in to Forma" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  const assets = await Promise.all(assetResponses);
  const scripts = assets.filter((asset) => asset.resourceType === "script");
  const stylesheets = assets.filter(
    (asset) => asset.resourceType === "stylesheet",
  );

  expect(
    scripts.length,
    "Next.js script assets should be requested",
  ).toBeGreaterThan(0);
  expect(
    stylesheets.length,
    "Next.js CSS assets should be requested",
  ).toBeGreaterThan(0);
  for (const asset of [...scripts, ...stylesheets]) {
    expect(asset.status, asset.url).toBe(200);
    expect(asset.bodyPrefix, asset.url).not.toMatch(/<(!doctype|html)/i);
  }
  for (const asset of scripts) {
    expect(asset.contentType, asset.url).toMatch(/javascript|ecmascript/i);
  }
  for (const asset of stylesheets) {
    expect(asset.contentType, asset.url).toMatch(/text\/css/i);
  }

  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Sign in to Forma" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Forma home" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to Forma" }),
  ).toBeVisible();

  expect(failedStaticRequests).toEqual([]);
  expect(runtimeErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("sign-in recovers when the authentication request fails", async ({
  page,
}) => {
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.abort("failed"),
  );
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("user@example.invalid");
  await page.getByLabel("Password").fill("FormaDemo2026!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page.getByText(
      "Unable to reach Forma. Check your connection and try again.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
});
