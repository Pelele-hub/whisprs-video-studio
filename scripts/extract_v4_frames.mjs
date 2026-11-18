import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const VIDEO_PATH = 'C:/Users/majji/whisprs_video_studio/output/whisprs_flow_video4_master.mp4';
const OUT_DIR = 'C:/Users/majji/whisprs_video_studio/output/sync_frames_v4';

fs.mkdirSync(OUT_DIR, { recursive: true });

const checkPoints = [
  // Active speech (subtitles MUST be visible)
  { time: '00:00:01.50', name: 'text_active_scene1.jpg', label: 'Scene 1 Speech Active (1.50s)' },
  { time: '00:00:04.80', name: 'text_active_scene2.jpg', label: 'Scene 2 Speech Active (4.80s)' },
  { time: '00:00:07.50', name: 'text_active_scene3.jpg', label: 'Scene 3 Speech Active (7.50s)' },
  { time: '00:00:10.50', name: 'text_active_scene4.jpg', label: 'Scene 4 Speech Active (10.50s)' },
  { time: '00:00:14.00', name: 'text_active_scene5.jpg', label: 'Scene 5 Speech Active (14.00s)' },

  // Breath pauses (subtitles MUST vanish completely)
  { time: '00:00:03.35', name: 'text_pause_disappear_1.jpg', label: 'Pause 1 Disappear (3.35s)' },
  { time: '00:00:06.30', name: 'text_pause_disappear_2.jpg', label: 'Pause 2 Disappear (6.30s)' },
  { time: '00:00:08.80', name: 'text_pause_disappear_3.jpg', label: 'Pause 3 Disappear (8.80s)' },
  { time: '00:00:12.20', name: 'text_pause_disappear_4.jpg', label: 'Pause 4 Disappear (12.20s)' },
  { time: '00:00:16.80', name: 'text_pause_disappear_outro.jpg', label: 'Outro Disappear (16.80s)' },
];

console.log('[Verification] Extracting sync verification frames...');
for (const cp of checkPoints) {
  const dest = path.join(OUT_DIR, cp.name);
  execSync(`ffmpeg -y -ss ${cp.time} -i "${VIDEO_PATH}" -vframes 1 -q:v 2 "${dest}"`, { stdio: 'ignore' });
  console.log(`[Extracted] ${cp.label} -> ${dest}`);
}

console.log('[Verification] All 10 verification frames extracted successfully!');
