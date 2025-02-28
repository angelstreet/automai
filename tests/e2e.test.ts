jest.setTimeout(30000);

import puppeteer, { Browser, Page } from 'puppeteer';

describe('Automai Homepage', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  });

  it('should display Automai text on homepage', async () => {
    await page.goto('http://localhost:3000/en', { waitUntil: 'networkidle0' });
    const content = await page.content();
    expect(content).toContain('Automai');
  });
});
