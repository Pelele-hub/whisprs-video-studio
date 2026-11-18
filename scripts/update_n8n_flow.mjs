import fs from 'fs';

const file = 'C:/Users/majji/whisprs_video_studio/workflows/n8n/whisprs_flow_voicestudio_pipeline.json';
const w = JSON.parse(fs.readFileSync(file, 'utf8'));

w.name = 'Whisprs 3.0 - Google Flow (Veo) & Qwen 0.6 Cloned Voice Master Pipeline';
const paramNode = w.nodes.find(n => n.name.includes('Parameters'));
if (paramNode) {
  paramNode.parameters.jsCode = `const inputData = $input.item.json || {};
const query = inputData.query || {};
const body = inputData.body || inputData;

const title = body.title || query.title || "Learning to Breathe";
const customText = body.custom_text || query.custom_text || "you don't have to carry the weight of everything - because some things were never meant to be held ... and when you feel tired in a world that never stops - remember that healing is just learning to breathe ... so let your heavy thoughts rest - tomorrow will be kinder";
const category = body.category || query.category || "Solitude & Healing";
const promptIds = body.prompt_ids || query.prompt_ids || [6, 7, 8, 9, 10];

return {
  json: {
    engine: "google_flow_and_qwen_0.6",
    voice_engine: "qwen_0.6_whisper_cloned",
    title: title,
    category: category,
    custom_text: customText,
    prompt_ids: promptIds,
    job_id: \`job_flow_qwen_\${Date.now()}\`,
    triggered_at: new Date().toISOString()
  }
};`;
}

fs.writeFileSync(file, JSON.stringify(w, null, 2), 'utf8');
console.log('Updated whisprs_flow_voicestudio_pipeline.json successfully');
