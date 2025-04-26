import { beforeAll, afterAll } from '@jest/globals';
import { launch, Browser, Page } from 'puppeteer';

let browser: Browser;
let page: Page;

// Setup before all tests
beforeAll(async () => {
  // Launch browser
  browser = await launch({
    headless: true, // Run in headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Create a new page
  page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });

  // Enable both console log and error
  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.toString()));
});

// Cleanup after all tests
afterAll(async () => {
  await browser.close();
});

// Helper functions
export async function navigateToPage(path: string) {
  await page.goto(`http://localhost:3000${path}`);
  await page.waitForNetworkIdle();
}

export async function getElement(selector: string) {
  await page.waitForSelector(selector);
  return page.$(selector);
}

export async function getElements(selector: string) {
  await page.waitForSelector(selector);
  return page.$$(selector);
}

export async function getText(selector: string) {
  const element = await getElement(selector);
  return element?.evaluate((el) => el.textContent);
}

export async function click(selector: string) {
  const element = await getElement(selector);
  await element?.click();
}

export async function type(selector: string, text: string) {
  const element = await getElement(selector);
  await element?.type(text);
}

export async function selectRole(role: string) {
  await click('[role="combobox"]');
  await click(`[data-value="${role}"]`);
}

// Make page and browser available to tests
export { page, browser };
