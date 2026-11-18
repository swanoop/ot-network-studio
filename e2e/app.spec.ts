import { expect, test } from "@playwright/test";

test("load reference architecture, inspect registers and persist project", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("OT Network Studio", { exact: true })).toBeVisible();
  await expect(page.getByText("Start designing")).toBeVisible();
  await page.getByRole("button", { name: "Reference architectures" }).click();
  const dialog = page.getByRole("dialog", { name: "Reference architectures" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Purdue-style OT site/ }).click();
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue("Purdue-style OT site");
  await expect(page.locator(".react-flow__node").first()).toBeVisible();

  await page.getByRole("button", { name: "Inventory" }).click();
  await expect(page.getByText("Process PLC").first()).toBeVisible();
  await page.getByRole("button", { name: "Zones & Conduits" }).click();
  await expect(page.getByText("C-OPS-CELL").first()).toBeVisible();
  await page.getByRole("button", { name: "Rule Matrix" }).click();
  await expect(page.getByText("S7comm").first()).toBeVisible();
  await page.locator('nav.segmented button[title="Findings"]').click();
  await expect(page.getByRole("heading", { name: "Design findings" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveValue("Purdue-style OT site");
  expect(errors).toEqual([]);
});

test("JSON export contains a complete schema v2 project", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reference architectures" }).click();
  await page.getByRole("dialog", { name: "Reference architectures" }).getByRole("button", { name: /Purdue-style OT site/ }).click();
  await page.getByRole("button", { name: "Export" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByText("Project (JSON)").click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const project = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(project.schemaVersion).toBe(2);
  expect(project.nodes.length).toBeGreaterThan(20);
  expect(project.edges.length).toBeGreaterThan(10);
});
