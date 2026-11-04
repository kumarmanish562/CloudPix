import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx5kAAAAASUVORK5CYII=", "base64");
async function register(page: Page) {
  await page.goto("/register");
  await page.getByLabel("Display name").fill("Browser Tester");
  await page.getByLabel("Email", { exact: true }).fill(`browser-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("StrongPass123!");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/photos$/);
}
async function upload(page: Page, name: string) {
  await page.locator('input[type="file"]').first().setInputFiles({ name, mimeType: "image/png", buffer: png });
  await expect(page.getByRole("link", { name: `Open ${name}`, exact: true })).toBeVisible();
}
async function nav(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Open navigation", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("link", { name, exact: true }).filter({ visible: true }).click();
}

test("register, upload, favorite, tag, search, filter, and download an original", async ({ page }) => {
  await register(page);
  await upload(page, "holiday.png");
  await page.getByRole("button", { name: "Favorite holiday.png", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove holiday.png from favorites", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Open holiday.png", exact: true }).click();
  await page.getByLabel("Tags", { exact: true }).fill("Travel, Family");
  await page.getByRole("button", { name: "Save tags", exact: true }).click();
  await expect(page.getByText("Tags saved", { exact: true })).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download original", exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("holiday.png");
  expect(await readFile((await file.path())!)).toEqual(png);
  await page.getByRole("link", { name: "Back to photos", exact: true }).click();
  await page.getByLabel("Search photos by name or tag").fill("travel");
  await expect(page.getByRole("link", { name: "Open holiday.png" })).toBeVisible();
  await page.getByLabel("Search photos by name or tag").fill("missing");
  await expect(page.getByText("No matching photos", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByText("Filter by tag, format, or upload date", { exact: true }).click();
  await page.getByLabel("Tag", { exact: true }).selectOption("family");
  await expect(page.getByRole("link", { name: "Open holiday.png" })).toBeVisible();
  await page.screenshot({ path: "test-results/library-desktop.png", fullPage: true });
  await nav(page, "Favorites");
  await expect(page.getByRole("link", { name: "Open holiday.png" })).toBeVisible();
  await page.getByRole("button", { name: "Remove holiday.png from favorites" }).click();
  await expect(page.getByText("Keep your favorites close", { exact: true })).toBeVisible();
});

test("duplicate queue errors can be overridden and extra copies can be trashed and restored", async ({ page }) => {
  await register(page);
  await upload(page, "original.png");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "copy.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("This image is already in your library (including archive or trash)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Upload another copy", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open copy.png" })).toBeVisible();
  await nav(page, "Duplicates");
  await expect(page.getByRole("heading", { name: /Match set 1/ })).toBeVisible();
  await page.getByRole("button", { name: "Select extra copies", exact: true }).click();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Move selected copies to trash" }).click();
  await expect(page.getByText("No duplicate uploads found.", { exact: true })).toBeVisible();
  await nav(page, "Trash");
  await expect(page.getByRole("link", { name: "Open copy.png" })).toBeVisible();
  await page.getByRole("button", { name: "Select photos", exact: true }).click();
  await page.getByRole("button", { name: "Select copy.png", exact: true }).click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.getByText("Trash is empty", { exact: true })).toBeVisible();
});

test("albums can be shared anonymously, downloaded as ZIP, and revoked", async ({ page, browser }) => {
  await register(page);
  await upload(page, "trip.png");
  await nav(page, "Albums");
  await page.getByRole("button", { name: "New album", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill("Browser trip");
  await dialog.getByRole("button", { name: "Create album", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await nav(page, "Photos");
  await page.getByRole("button", { name: "Select photos", exact: true }).click();
  await page.getByRole("button", { name: "Select trip.png", exact: true }).click();
  await page.getByRole("button", { name: "Add to album", exact: true }).click();
  await dialog.getByRole("button", { name: /Browser trip/ }).click();
  await dialog.getByRole("button", { name: "Add to album", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await nav(page, "Albums");
  await page.getByRole("link", { name: /Browser trip/ }).click();
  await page.getByRole("button", { name: "Share album", exact: true }).click();
  await dialog.getByRole("button", { name: "Create share link", exact: true }).click();
  const link = await dialog.getByLabel("New share link", { exact: true }).inputValue();
  expect(link).toMatch(/\/shared\/[A-Za-z0-9_-]{43}$/);
  const anonymous = await browser.newContext();
  const publicPage = await anonymous.newPage();
  await publicPage.goto(link);
  await expect(publicPage.getByRole("heading", { name: "Browser trip", exact: true })).toBeVisible();
  await expect(publicPage.getByRole("link", { name: "View trip.png", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download ZIP", exact: true }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe("Browser trip.zip");
  expect((await readFile((await file.path())!)).subarray(0, 2).toString()).toBe("PK");
  await page.getByRole("button", { name: "Share album", exact: true }).click();
  await dialog.getByRole("button", { name: "Revoke", exact: true }).click();
  await publicPage.reload();
  await expect(publicPage.getByRole("heading", { name: "This album is unavailable", exact: true })).toBeVisible();
  await anonymous.close();
});

test("a failed upload can be retried without losing other items", async ({ page }) => {
  await register(page);
  let first = true;
  await page.route("**/photos/upload?*", async (route) => {
    if (first) { first = false; await route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"Temporary upload failure"}' }); }
    else await route.continue();
  });
  await page.locator('input[type="file"]').first().setInputFiles({ name: "retry.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("Temporary upload failure", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open retry.png" })).toBeVisible();
});

test("queued uploads can be cancelled while another upload completes", async ({ page }) => {
  await register(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/photos/upload?*", async (route) => { await gate; await route.continue().catch(() => {}); });
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "slow.png", mimeType: "image/png", buffer: png },
    { name: "cancel.png", mimeType: "image/png", buffer: png },
  ]);
  await page.getByRole("button", { name: "Cancel cancel.png", exact: true }).click();
  await expect(page.getByText("cancelled", { exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("link", { name: "Open slow.png" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open cancel.png" })).toHaveCount(0);
});

test("mobile navigation and memories render without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page);
  await nav(page, "Memories");
  await expect(page.getByRole("heading", { name: "On this day", exact: true })).toBeVisible();
  await expect(page.getByLabel("Choose a day")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/memories-mobile.png", fullPage: true });
});

test("the PowerShell smoke script completes the full backend lifecycle", async () => {
  const result = await promisify(execFile)("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
    "../scripts/smoke-backend.ps1", "-BaseUrl", "http://localhost:8088/api"], { timeout: 60_000 });
  expect(result.stdout).toContain("Smoke test passed.");
});

