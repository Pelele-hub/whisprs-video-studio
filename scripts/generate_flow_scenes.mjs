// generate_flow_scenes.mjs - Generate Scene Images from Prompts Catalog
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PROMPTS_FILE = path.join(ROOT_DIR, 'config', 'image_prompts.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'flow_catalog');

export function loadPrompts() {
  if (!fs.existsSync(PROMPTS_FILE)) {
    throw new Error(`Prompts file not found at: ${PROMPTS_FILE}`);
  }
  return JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));
}

export function selectPromptsForVideo(promptIds = [], count = 5) {
  const allPrompts = loadPrompts();
  if (promptIds && promptIds.length > 0) {
    const selected = promptIds.map(id => allPrompts.find(p => p.id === id || p.key === id)).filter(Boolean);
    if (selected.length > 0) return selected;
  }
  // Return first 'count' or random selection
  return allPrompts.slice(0, count);
}

export function formatFlowScenesPayload(project = 'WhisprsScenes', selectedPrompts = []) {
  return {
    project: project,
    scenes: selectedPrompts.map(p => {
      const cleanPrompt = p.prompt.endsWith('.') 
        ? `${p.prompt} Clean frame, absolutely no watermarks, no logos, no text, no signatures.`
        : `${p.prompt}, clean frame, absolutely no watermarks, no logos, no text, no signatures.`;
      return {
        prompt: cleanPrompt,
        model: "Nano Banana 2.1",
        aspect_ratio: p.aspect_ratio || "9:16",
        download_quality: "upscaled",
        type: "image"
      };
    })
  };
}

if (process.argv[1] && process.argv[1].endsWith('generate_flow_scenes.mjs')) {
  const count = parseInt(process.argv[2] || '5', 10);
  const selected = selectPromptsForVideo([], count);
  console.log(`\n======================================================`);
  console.log(`[Whisprs Studio] Selected ${selected.length} Image Generation Prompts`);
  console.log(`======================================================\n`);
  selected.forEach(p => {
    console.log(`[#${p.id}] ${p.title}`);
    console.log(`     Prompt: ${p.prompt.slice(0, 110)}...`);
  });
  const payload = formatFlowScenesPayload('WhisprsVideo', selected);
  console.log('\n[Flow MCP Payload Sample]:');
  console.log(JSON.stringify(payload, null, 2));
}
