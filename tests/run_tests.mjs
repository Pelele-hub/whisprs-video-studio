// run_tests.mjs - Automated Verification Suite for Whisprs Video Studio
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('=== RUNNING WHISPRS VIDEO STUDIO TEST SUITE ===\n');

// Test 1: Configuration Integrity
console.log('1. Configuration Tests:');
try {
  const style = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'config', 'style_profile.json'), 'utf-8'));
  assert(style.target_resolution.width === 1080 && style.target_resolution.height === 1920, 'style_profile.json has 1080x1920 target');
  assert(style.content_pillars.length >= 5, 'style_profile.json defines 5 content pillars');

  const render = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'config', 'render_profile.json'), 'utf-8'));
  assert(render.video_codec === 'libx264', 'render_profile.json specifies libx264');

  const voice = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'config', 'voice_profile.json'), 'utf-8'));
  assert(voice.default_voice.includes('Neural'), 'voice_profile.json specifies neural voice');
} catch (e) {
  assert(false, `Config parsing error: ${e.message}`);
}

// Test 2: Asset Availability
console.log('\n2. Asset Availability Tests:');
const visualsDir = path.join(ROOT_DIR, 'assets', 'visuals');
const musicDir = path.join(ROOT_DIR, 'assets', 'music');
const visuals = fs.readdirSync(visualsDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
const music = fs.readdirSync(musicDir).filter(f => f.endsWith('.ogg') || f.endsWith('.mp3'));

assert(visuals.length >= 10, `Found ${visuals.length} visual assets (target >= 10)`);
assert(music.length >= 4, `Found ${music.length} classical music tracks (target >= 4)`);

// Test 3: Binary Tool Availability
console.log('\n3. Tooling Environment Tests:');
try {
  const ffmpegVer = execSync('ffmpeg -version', { encoding: 'utf-8' }).split('\n')[0];
  assert(ffmpegVer.includes('ffmpeg version'), `FFmpeg is available: ${ffmpegVer.slice(0, 30)}...`);
} catch (e) {
  assert(false, 'FFmpeg binary missing');
}

try {
  const ffprobeVer = execSync('ffprobe -version', { encoding: 'utf-8' }).split('\n')[0];
  assert(ffprobeVer.includes('ffprobe version'), `ffprobe is available: ${ffprobeVer.slice(0, 30)}...`);
} catch (e) {
  assert(false, 'ffprobe binary missing');
}

// Test 4: Reference Videos
console.log('\n4. Reference Video Evidence Tests:');
const refDir = path.join(ROOT_DIR, 'reference_videos');
const refVideos = fs.readdirSync(refDir).filter(f => f.endsWith('.mp4'));
assert(refVideos.length >= 3, `Verified ${refVideos.length} actual reference video downloads in reference_videos/`);

// Test 5: Pilot Render Validation
console.log('\n5. Rendered Output Tests:');
const outDir = path.join(ROOT_DIR, 'output');
const outVideos = fs.readdirSync(outDir).filter(f => f.endsWith('.mp4'));
assert(outVideos.length >= 1, `Found ${outVideos.length} rendered video(s) in output/`);

console.log(`\n==============================================`);
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Passed (${((passedTests/totalTests)*100).toFixed(0)}%)`);
console.log(`==============================================`);

if (passedTests !== totalTests) {
  process.exit(1);
}
