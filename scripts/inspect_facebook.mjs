// inspect_facebook.mjs - Inspects Facebook reference page and extracts posts/metadata
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'https://www.facebook.com/p/Whisprs--61584242948204/';
const OUT_DIR = 'C:/Users/majji/whisprs_video_studio/reference_analysis';

async function main() {
  console.log('Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 1800 }
  });
  const page = await context.newPage();

  console.log(`Navigating to ${TARGET_URL}...`);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(e => {
    console.log('Networkidle timeout, continuing anyway:', e.message);
  });

  await page.waitForTimeout(3000);

  // Close consent / login prompts if present
  try {
    const closeBtns = await page.$$('[aria-label="Fermer"], [aria-label="Close"], [aria-label="Decline optional cookies"], [data-testid="cookie-policy-manage-dialog-accept-button"]');
    for (const btn of closeBtns) {
      await btn.click().catch(() => {});
    }
  } catch (e) {}

  // Take full screenshot
  const screenshotPath = path.join(OUT_DIR, 'facebook_page_screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Saved screenshot to ${screenshotPath}`);

  // Extract page title, bio, intro
  const pageData = await page.evaluate(() => {
    const textContent = document.body.innerText;
    const title = document.title;
    
    // Look for intro / bio
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, span, div'))
      .map(el => el.innerText ? el.innerText.trim() : '')
      .filter(t => t.length > 0);

    // Look for video elements or links
    const videoLinks = Array.from(document.querySelectorAll('a[href*="/reel/"], a[href*="/videos/"], a[href*="watch"]'))
      .map(a => ({ href: a.href, text: a.innerText.trim() }));

    const images = Array.from(document.querySelectorAll('img[src*="fbcdn"]'))
      .map(img => img.src)
      .slice(0, 15);

    return {
      title,
      videoLinks,
      imageCount: images.length,
      images,
      sampleHeadings: headings.slice(0, 40),
      bodySnippet: textContent.slice(0, 3000)
    };
  });

  fs.writeFileSync(path.join(OUT_DIR, 'raw_facebook_data.json'), JSON.stringify(pageData, null, 2), 'utf-8');
  console.log('Saved raw_facebook_data.json successfully');

  await browser.close();
}

main().catch(err => {
  console.error('Error inspecting Facebook:', err);
  process.exit(1);
});
