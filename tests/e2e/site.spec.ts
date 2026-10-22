import { expect, test, type Page } from "@playwright/test";

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("homepage search leads to a tutorial", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Learn System Design, Step by Step");
  await page.getByLabel("Search tutorials").fill("ticket");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/system-design\?q=ticket/);
  await page.getByRole("link", { name: "Read the tutorial" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Design a ticket booking system like Ticketmaster");
  expect(errors).toEqual([]);
});

test("no private planning information on public pages", async ({ page, request }) => {
  for (const path of ["/", "/system-design", "/system-design/ticketmaster", "/about"]) {
    await page.goto(path);
    const text = await page.locator("body").innerText();
    expect(text, path).not.toMatch(/120-day|Day \d+|deep dive|draft|Monday(?!\.com)|LinkedIn|2026-1[012]-|2027-0[12]-/i);
  }
  const index = await (await request.get("/search-index.json")).text();
  expect(index).not.toMatch(/202[67]-\d\d-\d\d|deep dive|draft/i);
  // Old public planning pages no longer exist.
  expect((await request.get("/roadmap", { maxRedirects: 0 })).status()).toBe(307);
});

test("catalog filters by category and shows an empty state", async ({ page }) => {
  await page.goto("/system-design");
  await expect(page.getByTestId("catalog-count")).toHaveText("121 platforms");
  await page.getByTestId("catalog-category").selectOption("payments");
  await expect(page).toHaveURL(/category=payments/);
  await expect(page.getByTestId("catalog-count")).toHaveText("6 platforms of 121");
  await page.getByTestId("catalog-search").fill("zzzz");
  await expect(page.getByText("No platforms match.")).toBeVisible();
});

test("Send request animates along the configured path and completes", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/system-design/ticketmaster#workflows");
  const d = page.getByTestId("workflow-hold-seats");
  await d.scrollIntoViewIfNeeded();
  await d.getByTestId("send-request").click();

  // The pulse appears on the first real arrow, fan -> seat service, and that node lights up on arrival.
  await expect(d.getByTestId("pulse")).toBeVisible();
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "fan->seatsvc");
  await expect(d.locator('[data-node="seatsvc"]')).toHaveAttribute("data-state", "active");
  await expect(d.locator('[data-node="fan"]')).toHaveAttribute("data-state", "idle");

  // Then the next arrow in order.
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "seatsvc->seatdb", { timeout: 6000 });

  // Pause freezes the step.
  await d.getByTestId("pause").click();
  const counter = await d.getByTestId("step-counter").textContent();
  await page.waitForTimeout(1500);
  await expect(d.getByTestId("step-counter")).toHaveText(counter ?? "");

  // Resume and run to the end: the response returns to the fan and the run stops.
  await d.getByTestId("resume").click();
  await expect(d.getByTestId("step-text")).toContainText("Request complete", { timeout: 15000 });
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "seatdb->fan");
  await expect(d.getByTestId("pulse")).toHaveCount(0);
  await expect(d.getByTestId("send-request")).toHaveText(/Send again/);

  await d.getByTestId("reset").click();
  await expect(d.getByTestId("step-counter")).toHaveText("4 steps");
  await expect(d.getByTestId("active-edge")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("failure view stops at the failing component and shows recovery, not success", async ({ page }) => {
  await page.goto("/system-design/ticketmaster#workflows");
  const d = page.getByTestId("workflow-pay");
  await d.scrollIntoViewIfNeeded();
  await d.getByRole("tab", { name: "When something fails" }).click();
  const total = Number((await d.getByTestId("step-counter").textContent())!.match(/\d+/)![0]);
  for (let i = 0; i < 4; i++) await d.getByTestId("next-step").click();
  await expect(d.locator('[data-node="payments"]')).toHaveAttribute("data-state", "failed");
  await expect(d.getByTestId("step-text")).toContainText("Failure at Payment provider");
  for (let i = 4; i < total; i++) await d.getByTestId("next-step").click();
  await expect(d.getByTestId("step-text")).toContainText("did not succeed normally");
  await expect(d.getByTestId("step-text")).not.toContainText("Request complete");
});

test("selecting a component explains it in plain English", async ({ page }) => {
  await page.goto("/system-design/ticketmaster#architecture");
  const d = page.getByTestId("workflow-overview");
  await d.getByRole("tab", { name: "Detailed" }).click();
  await d.locator('[data-node="queue"]').click();
  const e = d.getByTestId("node-explain");
  await expect(e).toContainText("What is it?");
  await expect(e).toContainText("A message queue: a list of jobs waiting to be done later.");
  await d.locator('[data-node="queue"]').press("Enter");
  await expect(e).toHaveCount(0);
});

test("capacity calculator recalculates servers", async ({ page }) => {
  await page.goto("/system-design/ticketmaster#capacity");
  const c = page.getByTestId("traffic-capacity");
  await expect(c.getByTestId("servers")).toHaveText("28");
  await c.getByLabel("Peak multiplier (x)", { exact: true }).fill("6");
  await expect(c.getByTestId("servers")).toHaveText("55");
  await c.getByLabel("Peak multiplier (x)", { exact: true }).fill("500");
  await expect(c.getByText("Enter a number from 1 to 50.")).toBeVisible();
  await expect(c.getByTestId("servers")).toHaveText("55");
});

test("queue demo updates the line length", async ({ page }) => {
  await page.goto("/system-design/ticketmaster#decisions");
  const q = page.getByTestId("queue-demo");
  const before = await q.getByTestId("queue-result").textContent();
  await q.getByLabel("Fans let into the shop per second", { exact: true }).fill("400");
  await expect(q.getByTestId("queue-result")).not.toHaveText(before ?? "");
});

test("header search finds a pattern by keyboard", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByTestId("open-search").click();
  await page.getByTestId("search-input").fill("idempotency");
  await expect(page.getByTestId("search-results").getByRole("option").first()).toContainText("Idempotency");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/patterns\/idempotency/);
});

test("old URLs redirect and unknown tutorials return 404", async ({ page, request }) => {
  await page.goto("/platforms/ticketmaster");
  await expect(page).toHaveURL(/\/system-design\/ticketmaster$/);
  const res = await page.goto("/system-design/not-a-real-platform");
  expect(res?.status()).toBe(404);
  await expect(page.getByTestId("not-found")).toContainText("Page not found");
  await expect(page.getByTestId("not-found").getByRole("link", { name: /Design a video streaming service like Netflix/ })).toBeVisible();
  expect((await request.get("/practice")).url()).toMatch(/\/$/);
});

test("@responsive layout has no horizontal scroll, and phones get the text workflow", async ({ page, viewport }) => {
  for (const path of ["/", "/system-design", "/system-design/ticketmaster", "/patterns/waiting-room", "/glossary"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  if ((viewport?.width ?? 1440) < 640) {
    await page.goto("/system-design/ticketmaster#workflows");
    const d = page.getByTestId("workflow-hold-seats");
    await expect(d.getByRole("list", { name: "Steps" })).toBeVisible();
    await d.getByTestId("next-step").click();
    await expect(d.getByTestId("step-text")).toContainText("Fan:");
  }
});

test("with reduced motion, steps advance without a moving pulse", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/system-design/ticketmaster#workflows");
  const d = page.getByTestId("workflow-hold-seats");
  await d.scrollIntoViewIfNeeded();
  await d.getByTestId("send-request").click();
  await expect(d.getByTestId("step-counter")).toHaveText("Step 2 of 4", { timeout: 6000 });
  await expect(d.getByTestId("pulse")).toHaveCount(0);
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "fan->seatsvc");
});

test("IRCTC tutorial tells the story with you as the passenger and plays the booking", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/system-design/irctc");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Design a train ticket booking system like IRCTC");
  await expect(page.getByTestId("story")).toContainText("Imagine you are the passenger");
  const d = page.getByTestId("workflow-book");
  await d.scrollIntoViewIfNeeded();
  await d.getByTestId("send-request").click();
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "you->bq");
  await expect(d.locator('[data-node="bq"]')).toHaveAttribute("data-state", "active");
  await d.getByRole("tab", { name: "When something fails" }).click();
  for (let i = 0; i < 8; i++) await d.getByTestId("next-step").click();
  await expect(d.locator('[data-node="pnrdb"]')).toHaveAttribute("data-state", "failed");
  await d.getByTestId("next-step").click();
  await expect(d.getByTestId("step-text")).toContainText("Payment check job");
  expect(errors).toEqual([]);
});

test("Uber tutorial: you are the rider, and matching plays in order", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/system-design/uber");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Design a ride-hailing app like Uber");
  await expect(page.getByTestId("story")).toContainText("Imagine you are the rider");
  const d = page.getByTestId("workflow-matching");
  await d.scrollIntoViewIfNeeded();
  await d.getByRole("tab", { name: "Detailed" }).click();
  await d.getByTestId("send-request").click();
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "you->api");
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "api->match", { timeout: 6000 });
  await d.getByRole("tab", { name: "When something fails" }).click();
  await d.getByLabel("Failure").selectOption("same-driver");
  for (let i = 0; i < 6; i++) await d.getByTestId("next-step").click();
  await expect(d.locator('[data-node="status"]')).toHaveAttribute("data-state", "failed");
  expect(errors).toEqual([]);
});

test("platforms without a tutorial have a clear page with no planning details", async ({ page }) => {
  const res = await page.goto("/system-design/zomato");
  expect(res?.status()).toBe(200);
  const up = page.getByTestId("upcoming");
  await expect(up).toContainText("This tutorial is not written yet.");
  await expect(up).toContainText("Dinner-peak order orchestration");
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/120-day|Day \d+|deep dive|draft|planned|2026-1[012]-|2027-0[12]-/i);
  await page.getByRole("link", { name: "Design a video streaming service like Netflix" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Design a video streaming service like Netflix");
});

test("Netflix tutorial: you are the viewer, and the adaptive-quality failure recovers", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/system-design/netflix");
  await expect(page.getByTestId("story")).toContainText("Imagine you are the viewer");
  const d = page.getByTestId("workflow-adaptive");
  await d.scrollIntoViewIfNeeded();
  await d.getByRole("tab", { name: "When something fails" }).click();
  const total = Number((await d.getByTestId("step-counter").textContent())!.match(/\d+/)![0]);
  for (let i = 0; i < 4; i++) await d.getByTestId("next-step").click();
  await expect(d.locator('[data-node="oca"]')).toHaveAttribute("data-state", "failed");
  for (let i = 4; i < total; i++) await d.getByTestId("next-step").click();
  await expect(d.getByTestId("step-text")).toContainText("did not succeed normally");
  expect(errors).toEqual([]);
});

test("Rapido tutorial: first captain to accept wins, the second sees 'ride taken'", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/system-design/rapido");
  await expect(page.getByTestId("story")).toContainText("Imagine you are the rider");
  const d = page.getByTestId("workflow-booking");
  await d.scrollIntoViewIfNeeded();
  await d.getByRole("tab", { name: "Detailed" }).click();
  for (let i = 0; i < 8; i++) await d.getByTestId("next-step").click();
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "cap-a->claim");
  await d.getByTestId("next-step").click();
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "claim->cap-b");
  await expect(d.getByTestId("step-text")).toContainText("ride taken");
  expect(errors).toEqual([]);
});

test("Ola tutorial: a scheduled ride is picked up by the scheduler before matching", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/system-design/ola");
  await expect(page.getByTestId("story")).toContainText("Imagine you are the rider");
  const d = page.getByTestId("workflow-outstation");
  await d.scrollIntoViewIfNeeded();
  await d.getByRole("tab", { name: "Detailed" }).click();
  for (let i = 0; i < 5; i++) await d.getByTestId("next-step").click();
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "sched->timer");
  await d.getByTestId("next-step").click();
  await expect(d.getByTestId("active-edge")).toHaveAttribute("data-edge", "timer->match");
  expect(errors).toEqual([]);
});
