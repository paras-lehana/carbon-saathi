/**
 * Shared e2e utilities: console-error collection with benign-noise filtering,
 * the window.__saathi seeding fast path, cold-dev-server-tolerant navigation,
 * theme/points readers, and resilient form primitives reused across specs.
 * This module owns selector and wait conventions; specs own assertions.
 */
import { expect, type Locator, type Page } from '@playwright/test';

/** First hit on a Next.js dev route triggers an on-demand compile — allow 15s. */
export const COLD_START_TIMEOUT_MS = 15_000;

/** Shape of the debug hook installed by apps/web/lib/debug.ts (SPEC §5). */
export interface SaathiDebugApi {
  seedDemoUser: () => unknown;
  getState: () => unknown;
  logAction: (id: string) => unknown;
}

// Structural stand-ins for DOM types: this suite compiles without the DOM lib,
// and in-page callbacks only touch these few members.
interface ElementLike {
  id: string;
  textContent: string | null;
  getAttribute(name: string): string | null;
  closest(selector: string): ElementLike | null;
  ownerDocument: { querySelector(selector: string): ElementLike | null };
}
interface ValueInputLike {
  value: string;
  dispatchEvent(event: unknown): boolean;
}
type EventCtorLike = new (type: string, init?: { bubbles?: boolean }) => unknown;

// Dev-mode noise that never indicates a product bug; anything else fails smoke.
const BENIGN_CONSOLE_PATTERNS: ReadonlyArray<RegExp> = [
  /favicon/i,
  /hydrat/i, // React dev-mode hydration warnings
  /chrome-extension/i,
  /download the react devtools/i,
];

/** Starts collecting non-benign console/page errors; returns the live array. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  const isBenign = (text: string): boolean =>
    BENIGN_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    // Resource-load failures carry the URL in location, not in the message text.
    if (isBenign(`${message.text()} ${message.location().url}`)) return;
    errors.push(message.text());
  });
  page.on('pageerror', (error) => {
    if (isBenign(error.message)) return;
    errors.push(`pageerror: ${error.message}`);
  });
  return errors;
}

/**
 * Navigates and waits for the main landmark AND React hydration — survives
 * cold dev compiles. window.__saathi is installed by a root-layout client
 * effect, so its presence proves event handlers are attached on every route;
 * clicking earlier hits static HTML and the interaction is silently lost.
 */
export async function gotoAndWait(page: Page, route: string): Promise<void> {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main').first()).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  await page.waitForFunction(
    () => Boolean((globalThis as unknown as { __saathi?: SaathiDebugApi }).__saathi),
    undefined,
    { timeout: COLD_START_TIMEOUT_MS },
  );
}

/** Seeds a demo user through the window.__saathi debug API (fast journey path). */
export async function seedViaDebug(page: Page): Promise<void> {
  await gotoAndWait(page, '/');
  await page.evaluate(async () => {
    const api = (globalThis as unknown as { __saathi?: SaathiDebugApi }).__saathi;
    if (!api) throw new Error('window.__saathi debug API is not installed');
    // seedDemoUser may be sync or async depending on store round-trips.
    await Promise.resolve(api.seedDemoUser());
  });
}

/** Theme toggle control: testid first, accessible name as the fallback. */
export function themeToggle(page: Page): Locator {
  return page
    .locator('[data-testid="theme-toggle"]')
    .or(page.getByRole('button', { name: /theme|dark|light/i }))
    .first();
}

/** Reads data-theme from html (globals.css keys off the root) then body. */
export async function getTheme(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const doc = (
      globalThis as unknown as { document: { documentElement: ElementLike; body: ElementLike } }
    ).document;
    return doc.documentElement.getAttribute('data-theme') ?? doc.body.getAttribute('data-theme');
  });
}

/** Numeric value currently rendered in the dashboard-points card. */
export async function readPoints(page: Page): Promise<number> {
  const raw = await page.getByTestId('dashboard-points').innerText();
  const match = raw.replace(/,/g, '').match(/\d+/);
  if (!match) throw new Error(`dashboard-points has no numeric value: "${raw}"`);
  return Number(match[0]);
}

/** Best-effort accessible name for a control (aria-label/label/name/placeholder). */
export async function fieldName(control: Locator): Promise<string> {
  return control.evaluate((el) => {
    const node = el as unknown as ElementLike;
    const aria = node.getAttribute('aria-label');
    if (aria) return aria;
    if (node.id) {
      const label = node.ownerDocument.querySelector(`label[for="${node.id}"]`);
      if (label?.textContent) return label.textContent;
    }
    const wrapping = node.closest('label');
    if (wrapping?.textContent) return wrapping.textContent;
    return node.getAttribute('name') ?? node.getAttribute('placeholder') ?? '';
  });
}

/**
 * Sets a controlled <input type="range"> value. React tracks the prototype
 * value setter, so .fill() never updates controlled sliders — assign through
 * the prototype descriptor, then emit native bubbling input/change events.
 */
export async function setRangeValue(slider: Locator, value: number): Promise<void> {
  await slider.evaluate((el, target) => {
    const input = el as unknown as ValueInputLike;
    const proto = Object.getPrototypeOf(input) as object;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && typeof descriptor.set === 'function') {
      descriptor.set.call(input, String(target));
    } else {
      input.value = String(target);
    }
    const EventCtor = (globalThis as unknown as { Event: EventCtorLike }).Event;
    input.dispatchEvent(new EventCtor('input', { bubbles: true }));
    input.dispatchEvent(new EventCtor('change', { bubbles: true }));
  }, value);
}

/** First visible match — inactive tab panels keep their controls in the DOM. */
export async function firstVisible(locator: Locator): Promise<Locator | null> {
  const count = await locator.count();
  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i);
    if (await candidate.isVisible()) return candidate;
  }
  return null;
}

/** Picks an option matching `pattern` across radios, segmented buttons or selects. */
export async function selectChoice(page: Page, pattern: RegExp): Promise<boolean> {
  const radio = await firstVisible(page.getByRole('radio', { name: pattern }));
  if (radio) {
    await radio.check();
    return true;
  }
  const button = await firstVisible(page.locator('main').getByRole('button', { name: pattern }));
  if (button) {
    await button.click();
    return true;
  }
  const selects = page.locator('select:visible');
  const total = await selects.count();
  for (let i = 0; i < total; i++) {
    const select = selects.nth(i);
    const labels = await select.locator('option').allInnerTexts();
    const index = labels.findIndex((label) => pattern.test(label));
    if (index >= 0) {
      await select.selectOption({ index });
      return true;
    }
  }
  return false;
}

/** Any native radio group left untouched gets its first option (form validity). */
export async function completeRadioGroups(page: Page): Promise<void> {
  const radios = page.locator('input[type="radio"]:visible');
  const total = await radios.count();
  const seen = new Set<string>();
  for (let i = 0; i < total; i++) {
    const radio = radios.nth(i);
    const group = (await radio.getAttribute('name')) ?? `__anon-${i}`;
    if (seen.has(group)) continue;
    seen.add(group);
    const alreadyChecked = group.startsWith('__anon-')
      ? false
      : (await page.locator(`input[type="radio"][name="${group}"]:checked`).count()) > 0;
    if (!alreadyChecked) await radio.check();
  }
}

/** Fills a numeric field by label/role, falling back to the first visible number input. */
export async function fillNumberField(page: Page, pattern: RegExp, value: string): Promise<void> {
  const byLabel = await firstVisible(page.getByLabel(pattern));
  if (byLabel) {
    await byLabel.fill(value);
    return;
  }
  const bySpinbutton = await firstVisible(page.getByRole('spinbutton', { name: pattern }));
  if (bySpinbutton) {
    await bySpinbutton.fill(value);
    return;
  }
  const fallback = await firstVisible(page.locator('input[type="number"]'));
  if (!fallback) throw new Error(`No numeric field found for ${String(pattern)}`);
  await fallback.fill(value);
}

/** Runs the Surya Ghar calculator on /schemes and returns the result panel. */
export async function runSuryaGharCalculation(page: Page, monthlyUnits: number): Promise<Locator> {
  const tab = await firstVisible(page.getByRole('tab', { name: /surya/i }));
  if (tab) await tab.click();
  // /month/i targets the consumption field without matching the tariff-per-unit input.
  await fillNumberField(page, /month/i, String(monthlyUnits));
  const submit = await firstVisible(
    page.locator('main').getByRole('button', { name: /calculate|estimate|check|subsidy|saving/i }),
  );
  if (!submit) throw new Error('Surya Ghar submit button not found');
  await submit.click();
  const result = page.getByTestId('scheme-result');
  await expect(result).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  return result;
}

/** Clicks the first suggested-question chip and waits for a demo-mode reply. */
export async function askAssistantViaChip(page: Page): Promise<Locator> {
  const log = page.getByRole('log').first();
  await expect(log).toBeVisible({ timeout: COLD_START_TIMEOUT_MS });
  const chip = await firstVisible(
    page
      .locator('main')
      .getByRole('button', { name: /\?|surya|solar|kusum|footprint|carbon|veg/i }),
  );
  if (!chip) throw new Error('No suggestion chip found on /assistant');
  await chip.click();
  // playwright.config forces DEMO_MODE=true, so every reply must carry the demo badge.
  await expect(log.getByText(/\bdemo\b/i).first()).toBeVisible({ timeout: 10_000 });
  return log;
}

/** The single sanctioned settle: lets entrance animations finish before capture. */
export async function settleForScreenshot(page: Page): Promise<void> {
  await page.waitForTimeout(300);
}
