import { expect, test, type Page } from "@playwright/test";
import type { WorksheetApiRecord } from "../../shared/contracts/worksheet-api";

const password = "Forma-Playwright-Only-2026!";

test("an authenticated user edits, saves, and reopens a calculation worksheet", async ({
  page,
}) => {
  await register(page);
  await expect(page.locator("math-field")).toHaveCount(3);
  await expect(page.getByText("397.1565", { exact: true })).toBeVisible();

  await replaceMathValue(page, 0, "160");
  await expect(page.getByText("446.4", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await worksheetRecords(page))[0]?.revision)
    .toBe(2);

  await page.reload();
  await expect(page.locator("math-field")).toHaveCount(3);
  await expect(page.getByText("446.4", { exact: true })).toBeVisible();
  expect(
    (await worksheetRecords(page))[0].document.regions.find(
      (region) => region.id === "load",
    ),
  ).toMatchObject({
    content: {
      name: "load",
      expression: { kind: "number", value: 160 },
    },
  });
});

test("the math toolbox inserts into the active MathLive field", async ({
  page,
}) => {
  await register(page);
  const fields = page.locator("math-field");
  await expect(fields).toHaveCount(3);
  const activeField = fields.first();
  const initialValue = await activeField.evaluate((element) =>
    (element as HTMLElement & { getValue(format: string): string }).getValue(
      "ascii-math",
    ),
  );

  await activeField.click();
  await expect
    .poll(() =>
      activeField.evaluate(
        (element) => element.closest(".worksheet-region")?.className,
      ),
    )
    .toMatch(/active/);
  await page.getByRole("button", { name: "7", exact: true }).click();
  await expect(fields).toHaveCount(3);

  await expect
    .poll(() =>
      activeField.evaluate((element) =>
        (
          element as HTMLElement & { getValue(format: string): string }
        ).getValue("ascii-math"),
      ),
    )
    .not.toBe(initialValue);
});

test("fraction expressions calculate and persist after reload", async ({
  page,
}) => {
  await register(page);
  await replaceMathValue(page, 0, "1/2", "(1)/(2)");
  await expect(page.getByText("0.5", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await worksheetRecords(page))[0]?.revision)
    .toBe(2);

  await page.reload();

  await expect(page.getByText("0.5", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("math-field")
        .first()
        .evaluate((element) =>
          (
            element as HTMLElement & { getValue(format: string): string }
          ).getValue("ascii-math"),
        ),
    )
    .toBe("(1)/(2)");
});

test("text regions can be created, edited, deleted, undone, and redone", async ({
  page,
}) => {
  await register(page);
  await page.getByRole("button", { name: "Text region", exact: true }).click();
  const textRegion = page.getByRole("textbox", { name: "Text region 7" });
  await expect(textRegion).toBeVisible();
  await textRegion.fill("Audit note");
  await page.keyboard.press("Control+z");
  await expect(textRegion).toHaveValue("");
  await page.keyboard.press("Control+Shift+z");
  await expect(textRegion).toHaveValue("Audit note");
  await page.getByRole("button", { name: "Delete region 7" }).click();
  await expect(textRegion).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(textRegion).toHaveValue("Audit note");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(textRegion).toHaveCount(0);
});

test("dragging a region persists its worksheet coordinates", async ({
  page,
}) => {
  await register(page);
  const region = page.locator(".worksheet-region").nth(2);
  const initialStyle = await region.getAttribute("style");
  const grip = page.getByRole("button", { name: "Move region 3" });
  const box = await grip.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 60,
    box.y + box.height / 2 + 35,
    {
      steps: 6,
    },
  );
  await page.mouse.up();

  await expect.poll(() => region.getAttribute("style")).not.toBe(initialStyle);
  await expect
    .poll(async () => (await worksheetRecords(page))[0]?.revision)
    .toBe(2);
  const movedStyle = await region.getAttribute("style");

  await page.reload();

  await expect
    .poll(() => page.locator(".worksheet-region").nth(2).getAttribute("style"))
    .toBe(movedStyle);
});

test("blank math regions disappear on blur, including after clearing input", async ({
  page,
}) => {
  await register(page);
  const fields = page.locator("math-field");
  const pageBox = await page.locator(".worksheet-page").boundingBox();
  expect(pageBox).not.toBeNull();
  if (!pageBox) return;

  await page.mouse.click(pageBox.x + 620, pageBox.y + 500);
  await expect(fields).toHaveCount(4);
  const untouchedField = fields.nth(3);
  await expect(untouchedField).toBeFocused();
  await page.getByRole("textbox", { name: "Text region 1" }).click();
  await expect(fields).toHaveCount(3);

  await page.mouse.click(pageBox.x + 620, pageBox.y + 500);
  await expect(fields).toHaveCount(4);
  const clearedField = fields.nth(3);
  await clearedField.pressSequentially("7");
  await expect
    .poll(() =>
      clearedField.evaluate((element) =>
        (
          element as HTMLElement & { getValue(format: string): string }
        ).getValue("ascii-math"),
      ),
    )
    .toBe("7");
  await clearedField.evaluate((element) => {
    (
      element as HTMLElement & { executeCommand(command: string): boolean }
    ).executeCommand("selectAll");
  });
  await clearedField.press("Backspace");
  await expect
    .poll(() =>
      clearedField.evaluate((element) =>
        (
          element as HTMLElement & { getValue(format: string): string }
        ).getValue("ascii-math"),
      ),
    )
    .toBe("");
  await page.getByRole("textbox", { name: "Text region 1" }).click();
  await expect(fields).toHaveCount(3);
});

test("loading a worksheet removes previously persisted empty math regions", async ({
  page,
}) => {
  await register(page);
  await expect(page.getByText("Saved locally")).toBeVisible();
  const record = (await worksheetRecords(page))[0];
  const responseStatus = await page.evaluate(
    async ({ documentId, document, revision }) => {
      const requestId = crypto.randomUUID();
      const response = await fetch(`/api/worksheets/${documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        },
        body: JSON.stringify({
          document: {
            ...document,
            regions: [
              ...document.regions,
              {
                id: "old-empty-region",
                type: "math",
                content: {
                  kind: "expression",
                  expression: { kind: "empty" },
                },
                position: { x: 120, y: 220 },
                zIndex: document.regions.length,
              },
            ],
          },
          baseRevision: revision,
          requestId,
        }),
      });
      return response.status;
    },
    {
      documentId: record.document.id,
      document: record.document,
      revision: record.revision,
    },
  );
  expect(responseStatus).toBe(200);
  const updatedRecord = (await worksheetRecords(page))[0];
  const userId = await sessionUserId(page);
  await page.evaluate(
    ({ userId, record }) => {
      localStorage.setItem(
        `forma-worksheet-recovery-v1:${userId}`,
        JSON.stringify({
          recoveryVersion: 1,
          baseRevision: record.revision,
          document: record.document,
          savedAt: new Date().toISOString(),
        }),
      );
    },
    { userId, record: updatedRecord },
  );

  await page.reload();

  await expect(page.locator("math-field")).toHaveCount(3);
  await expect
    .poll(async () => (await worksheetRecords(page))[0]?.revision)
    .toBe(updatedRecord.revision + 1);
  expect((await worksheetRecords(page))[0].document.regions).toHaveLength(6);
});

test("math fields align to the click point and the toolbox owns the virtual keyboard", async ({
  page,
}) => {
  await register(page);
  const paperBox = await page.locator(".worksheet-page").boundingBox();
  expect(paperBox).not.toBeNull();
  if (!paperBox) return;
  const clickPoint = { x: paperBox.x + 620, y: paperBox.y + 500 };
  await page.mouse.click(clickPoint.x, clickPoint.y);

  const field = page.locator("math-field").nth(3);
  await expect(field).toBeFocused();
  const initialBox = await field.boundingBox();
  expect(initialBox).not.toBeNull();
  if (!initialBox) return;
  expect(Math.abs(initialBox.x - clickPoint.x)).toBeLessThan(3);
  expect(initialBox.width).toBeLessThan(100);

  const toolbox = page.getByRole("complementary", { name: "Math toolbox" });
  const regionActions = toolbox.locator(".region-actions");
  const keyboardButton = toolbox.getByRole("button", {
    name: "Toggle virtual keyboard",
  });
  const menuButton = toolbox.getByRole("button", { name: "Math editing menu" });
  await expect(keyboardButton).toHaveAttribute("aria-pressed", "true");
  await expect(menuButton).toBeEnabled();
  const menuPanel = toolbox.getByRole("region", { name: "Math editing menu" });
  await expect(
    menuPanel.getByText("Insert Matrix", { exact: true }),
  ).toBeVisible();
  await expect(menuPanel.getByText("Insert", { exact: true })).toBeVisible();
  await expect(menuPanel.getByText("Mode", { exact: true })).toBeVisible();
  await expect(
    menuPanel.getByText("Font Style", { exact: true }),
  ).toBeVisible();
  await expect(menuPanel.getByText("Color", { exact: true })).toBeVisible();
  await expect(menuPanel.getByRole("button", { name: "1 x 1" })).toBeVisible();
  await expect(regionActions.getByRole("button")).toHaveCount(4);
  await expect(
    page.locator(".keypad, .tool-group, .function-keys"),
  ).toHaveCount(0);
  await expect(page.locator(".math-editor-toolbar")).toHaveCount(0);

  const keyboardHost = toolbox.locator(".math-keyboard-host");
  const keyboard = keyboardHost.locator(".ML__keyboard");
  await expect(keyboard).toHaveCount(1);
  const hostBox = await keyboardHost.boundingBox();
  const keyboardBox = await keyboard.boundingBox();
  expect(hostBox).not.toBeNull();
  expect(keyboardBox).not.toBeNull();
  if (!hostBox || !keyboardBox) return;
  expect(keyboardBox.x).toBeGreaterThanOrEqual(hostBox.x);
  expect(keyboardBox.y).toBeGreaterThanOrEqual(hostBox.y);
  expect(keyboardBox.x + keyboardBox.width).toBeLessThanOrEqual(
    hostBox.x + hostBox.width + 1,
  );
  expect(keyboardBox.y + keyboardBox.height).toBeLessThanOrEqual(
    hostBox.y + hostBox.height + 1,
  );

  await keyboardButton.click();
  await expect(keyboardButton).toHaveAttribute("aria-pressed", "false");
  await keyboardButton.click();
  await expect(keyboardButton).toHaveAttribute("aria-pressed", "true");
  await menuButton.click();
  await expect(
    menuPanel.getByText("Insert Matrix", { exact: true }),
  ).toBeVisible();

  await field.pressSequentially("123456789");
  await expect
    .poll(async () => (await field.boundingBox())?.width ?? 0)
    .toBeGreaterThan(initialBox.width);
  const longExpressionBox = await field.boundingBox();
  expect(longExpressionBox).not.toBeNull();

  await field.evaluate((element) => {
    (
      element as HTMLElement & { executeCommand(command: string): boolean }
    ).executeCommand("selectAll");
  });
  await field.pressSequentially("sqrt(1/2)");
  await expect
    .poll(async () => (await field.boundingBox())?.height ?? 0)
    .toBeGreaterThan(initialBox.height);
});

test("worksheet creation failure preserves the current document", async ({
  page,
}) => {
  await register(page);
  const title = page.getByRole("textbox", { name: "Worksheet name" });
  const originalTitle = await title.inputValue();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/worksheets", (route) =>
    route.request().method() === "POST"
      ? route.abort("failed")
      : route.continue(),
  );

  await page.getByRole("button", { name: "New worksheet" }).click();

  await expect(page.getByText(/Unable to create worksheet:/)).toBeVisible();
  await expect(title).toHaveValue(originalTitle);
  expect(pageErrors).toEqual([]);
});

test("worksheet controls remain usable without page overflow on mobile", async ({
  page,
}) => {
  await register(page);
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const dimensions = await page.evaluate(() => {
      const header = document.querySelector(".topbar");
      return {
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        header: header?.scrollWidth ?? 0,
        headerClient: header?.clientWidth ?? 0,
      };
    });
    expect(
      dimensions.document,
      `document overflow at ${width}px`,
    ).toBeLessThanOrEqual(dimensions.viewport);
    expect(
      dimensions.header,
      `header overflow at ${width}px`,
    ).toBeLessThanOrEqual(dimensions.headerClient);
    await expect(
      page.getByRole("region", { name: "Worksheet canvas" }),
    ).toBeVisible();
    await expect(page.locator("math-field").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Math region" }),
    ).toBeVisible();
  }
});

test("corrupt local recovery does not block loading the server worksheet", async ({
  page,
}) => {
  await register(page);
  const userId = await sessionUserId(page);
  await page.evaluate((id) => {
    localStorage.setItem(`forma-worksheet-recovery-v1:${id}`, "not-json");
  }, userId);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.reload();

  await expect(
    page.getByRole("textbox", { name: "Worksheet name" }),
  ).toHaveValue("Shaft fatigue worksheet");
  await expect(
    page.getByText("Local recovery unreadable; server data loaded"),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("MathLive exposes a visible keyboard focus indicator", async ({
  page,
}) => {
  await register(page);
  const field = page.locator("math-field").first();
  await field.focus();
  const focusState = await field.evaluate((element) => {
    const region = element.closest(".worksheet-region");
    return {
      focused: element.matches(":focus"),
      active: region?.classList.contains("active"),
      borderColor: region ? getComputedStyle(region).borderTopColor : "",
    };
  });
  expect(focusState.focused).toBe(true);
  expect(focusState.active).toBe(true);
  expect(focusState.borderColor).not.toBe("rgba(0, 0, 0, 0)");
});

test("expired sessions preserve the draft without retrying permanent save errors", async ({
  page,
}) => {
  await register(page);
  let saveRequests = 0;
  await page.route("**/api/worksheets/*", (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    saveRequests += 1;
    return route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "unauthenticated",
          message: "Authentication is required",
        },
      }),
    });
  });

  await replaceMathValue(page, 0, "160");
  await expect(
    page.getByText("Session expired. Changes are saved locally."),
  ).toBeVisible();
  const userId = await sessionUserId(page);
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const draft = localStorage.getItem(`forma-worksheet-recovery-v1:${id}`);
        if (!draft) return null;
        const parsed = JSON.parse(draft);
        const load = parsed.document.regions.find(
          (region: { id: string }) => region.id === "load",
        );
        return load?.content.expression.value ?? null;
      }, userId),
    )
    .toBe(160);
  const retryPromise = page
    .waitForRequest(
      (request) =>
        request.method() === "PUT" &&
        request.url().includes("/api/worksheets/"),
      { timeout: 3500 },
    )
    .then(
      () => true,
      () => false,
    );
  expect(await retryPromise).toBe(false);
  expect(saveRequests).toBe(1);
});

test("logout protects direct navigation to the private worksheet route", async ({
  page,
}) => {
  await register(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to Forma" }),
  ).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to Forma" }),
  ).toBeVisible();
});

test("failed logout keeps the current session and reports the failure", async ({
  page,
}) => {
  await register(page);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/auth/sign-out", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "Sign-out service unavailable" }),
    }),
  );

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(
    page.getByText("Unable to sign out. Please try again."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("a user can create and switch between worksheets", async ({ page }) => {
  await register(page);
  const first = (await worksheetRecords(page))[0];

  await page.getByRole("button", { name: "New worksheet" }).click();
  const title = page.getByRole("textbox", { name: "Worksheet name" });
  await expect(title).toHaveValue("Untitled worksheet");
  await title.fill("Beam calculation");
  await expect.poll(async () => (await worksheetRecords(page)).length).toBe(2);

  const picker = page.getByLabel("Open worksheet");
  await picker.selectOption(first.document.id);
  await expect(title).toHaveValue("Shaft fatigue worksheet");
  await picker.selectOption(
    (await worksheetRecords(page)).find(
      (record) => record.document.title === "Beam calculation",
    )!.document.id,
  );
  await expect(title).toHaveValue("Beam calculation");
  await expect(page.locator("math-field")).toHaveCount(3);
});

test("worksheet sharing distinguishes viewers from editors and hides unshared documents", async ({
  browser,
  page,
}) => {
  await register(page);
  const ownerDocument = (await worksheetRecords(page))[0];
  const ownerId = await sessionUserId(page);

  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await register(viewerPage);
  const viewerId = await sessionUserId(viewerPage);
  const worksheetPath = `/api/worksheets/${ownerDocument.document.id}`;

  const hidden = await viewerContext.request.get(worksheetPath);
  expect(hidden.status()).toBe(404);

  const grantViewer = await page
    .context()
    .request.post(`${worksheetPath}/permissions`, {
      data: { userId: viewerId, permission: "viewer" },
    });
  expect(grantViewer.status()).toBe(200);
  expect((await viewerContext.request.get(worksheetPath)).status()).toBe(200);

  const viewerEdit = await viewerContext.request.put(worksheetPath, {
    data: {
      document: { ...ownerDocument.document, title: "Unauthorized edit" },
      baseRevision: 1,
      requestId: crypto.randomUUID(),
    },
  });
  expect(viewerEdit.status()).toBe(403);

  const grantEditor = await page
    .context()
    .request.post(`${worksheetPath}/permissions`, {
      data: { userId: viewerId, permission: "editor" },
    });
  expect(grantEditor.status()).toBe(200);
  const editorEdit = await viewerContext.request.put(worksheetPath, {
    data: {
      document: { ...ownerDocument.document, title: "Editor update" },
      baseRevision: 1,
      requestId: crypto.randomUUID(),
    },
  });
  expect(editorEdit.status()).toBe(200);
  expect((await worksheetRecords(page))[0].document.title).toBe(
    "Editor update",
  );
  expect(ownerId).not.toBe(viewerId);
  await viewerContext.close();
});

test("stale concurrent edits are surfaced and recoverable as a copy", async ({
  browser,
  page,
}) => {
  const account = await register(page);
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await signIn(otherPage, account.email);
  await expect(page.locator("math-field")).toHaveCount(3);
  await expect(otherPage.locator("math-field")).toHaveCount(3);

  await replaceMathValue(otherPage, 0, "150");
  await expect(otherPage.getByText("418.5", { exact: true })).toBeVisible();
  await expect
    .poll(async () => (await worksheetRecords(otherPage))[0]?.revision)
    .toBe(2);

  await replaceMathValue(page, 0, "160");
  await expect(page.getByText("446.4", { exact: true })).toBeVisible();
  await expect(page.getByText("Newer server revision detected.")).toBeVisible();
  expect(
    (await worksheetRecords(page))[0].document.regions.find(
      (region) => region.id === "load",
    ),
  ).toMatchObject({
    content: { expression: { kind: "number", value: 150 } },
  });

  await page.getByRole("button", { name: "Save draft as copy" }).click();
  await expect(page.getByText("Recovered as a new worksheet")).toBeVisible();
  await expect.poll(async () => (await worksheetRecords(page)).length).toBe(2);
  await otherContext.close();
});

async function register(page: Page): Promise<{ email: string }> {
  const email = `forma-${crypto.randomUUID()}@example.invalid`;
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /New to Forma/ }).click();
  await page.getByLabel("Name").fill("Forma E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/");
  await expect(
    page.getByRole("region", { name: "Worksheet canvas" }),
  ).toBeVisible();
  await expect(page.locator("math-field").first()).toBeVisible();
  await expect
    .poll(async () => (await worksheetRecords(page)).length)
    .toBeGreaterThan(0);
  return { email };
}

async function replaceMathValue(
  page: Page,
  index: number,
  value: string,
  expectedValue = value,
) {
  const field = page.locator("math-field").nth(index);
  await field.click();
  await field.evaluate((element) => {
    const mathfield = element as HTMLElement & {
      executeCommand(command: string): boolean;
      focus(): void;
    };
    mathfield.focus();
    mathfield.executeCommand("selectAll");
  });
  await field.pressSequentially(value);
  await expect
    .poll(() =>
      field.evaluate((element) =>
        (
          element as HTMLElement & { getValue(format: string): string }
        ).getValue("ascii-math"),
      ),
    )
    .toBe(expectedValue);
  return field;
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

async function worksheetRecords(page: Page): Promise<WorksheetApiRecord[]> {
  const response = await page.context().request.get("/api/worksheets");
  if (!response.ok())
    throw new Error(`Worksheet list returned ${response.status()}`);
  const payload = (await response.json()) as { data: WorksheetApiRecord[] };
  return payload.data;
}

async function sessionUserId(page: Page): Promise<string> {
  const response = await page.context().request.get("/api/auth/get-session");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { user: { id: string } };
  return payload.user.id;
}
