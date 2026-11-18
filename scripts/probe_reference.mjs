import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('whisprs_video_studio/reference_analysis/frames');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function analyzeReference() {
  console.log('Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  const networkMedia = [];
  page.on('response', async response => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    if (contentType.includes('video') || contentType.includes('audio') || url.includes('.mp4') || url.includes('.m4a')) {
      networkMedia.push({
        url: url.slice(0, 150) + '...',
        fullUrl: url,
        contentType,
        status: response.status()
      });
    }
  });

  console.log('Navigating to Whisprs Facebook Page...');
  await page.goto('https://www.facebook.com/p/Whisprs--61584242948204/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Close login dialog if present
  try {
    await page.evaluate(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs.forEach(d => d.remove());
    });
  } catch (e) {}

  // Scrape post texts and reel links
  const pageData = await page.evaluate(() => {
    const title = document.title;
    const body = document.body.innerText;
    const links = Array.from(document.querySelectorAll('a'))
      .map(a => ({ href: a.href, text: a.innerText.trim() }))
      .filter(l => l.href.includes('/reel/') || l.href.includes('/watch/'));
    
    // Extract text blocks
    const posts = Array.from(document.querySelectorAll('div[data-ad-preview="message"], div[dir="auto"]'))
      .map(d => d.innerText.trim())
      .filter(t => t.length > 20 && !t.includes('Se connecter') && !t.includes('Facebook'));

    return { title, links: [...new Set(links.map(l => l.href))], posts: [...new Set(posts)].slice(0, 15) };
  });

  console.log('Page Title:', pageData.title);
  console.log('Discovered Reel Links:', pageData.links.length);
  console.log('Sample Posts/Quotes:', pageData.posts.slice(0, 5));

  // Now inspect the specific Reel
  const reelUrl = pageData.links[0] || 'https://www.facebook.com/reel/1431871182441209/';
  console.log('Inspecting Reel:', reelUrl);
  await page.goto(reelUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Remove dialog
  await page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    dialogs.forEach(d => d.remove());
    const backdrop = document.querySelector('div[style*="rgba(0, 0, 0"]');
    if (backdrop) backdrop.remove();
  });

  // Extract video details
  const videoDetails = await page.evaluate(async () => {
    const v = document.querySelector('video');
    if (!v) return { found: false };
    v.muted = true;
    try { await v.play(); } catch (e) {}

    return {
      found: true,
      duration: v.duration,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      paused: v.paused,
      currentTime: v.currentTime
    };
  });

  console.log('Video Details:', videoDetails);

  // Capture frames at different timestamps
  const timestamps = [1.0, 3.5, 7.0, 11.0, 14.5];
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const frameData = await page.evaluate(async (targetTime) => {
      const v = document.querySelector('video');
      if (!v) return null;
      v.currentTime = targetTime;
      await new Promise(r => setTimeout(r, 600));
      const c = document.createElement('canvas');
      c.width = v.videoWidth || 720;
      c.height = v.videoHeight || 1284;
      const ctx = c.getContext('2d');
      ctx.drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.9);
    }, t);

    if (frameData) {
      const base64 = frameData.replace(/^data:image\/jpeg;base64,/, '');
      const framePath = path.join(OUT_DIR, `whisprs_reel1_frame_${i + 1}_${t}s.jpg`);
      fs.writeFileSync(framePath, Buffer.from(base64, 'base64'));
      console.log(`Saved frame ${i + 1} (${t}s) to:`, framePath);
    }
  }

  // Also check if any direct video URL was captured
  console.log(`Captured ${networkMedia.length} network media responses.`);
  const videoResponses = networkMedia.filter(m => m.contentType.includes('video') || m.fullUrl.includes('.mp4'));

  const report = {
    analyzedAt: new Date().toISOString(),
    referenceUrl: 'https://www.facebook.com/p/Whisprs--61584242948204/',
    examinedReelUrl: reelUrl,
    pageTitle: pageData.title,
    videoMetadata: videoDetails,
    discoveredReelLinks: pageData.links,
    discoveredQuotes: pageData.posts,
    mediaStreamsFound: videoResponses.slice(0, 5),
    savedFrames: timestamps.map((t, idx) => `whisprs_reel1_frame_${idx + 1}_${t}s.jpg`)
  };

  fs.writeFileSync('whisprs_video_studio/reference_analysis/probe_data.json', JSON.stringify(report, null, 2));
  console.log('Report saved to whisprs_video_studio/reference_analysis/probe_data.json');

  await browser.close();
}

analyzeReference().catch(err => {
  console.error('Error during reference probe:', err);
  process.exit(1);
});
