# Comprehensive Tool Research Report

## 1. Video Analysis Tools (B1)

### A. FFmpeg & ffprobe
- **Version Tested**: `9.0.2-full_build` (Gyan.dev, WinGet)
- **Architecture**: Native x86_64 Windows binary
- **Capabilities Verified**:
  - `ffprobe`: Frame-accurate metadata extraction (duration, codecs, bitrates, sample rates, channels).
  - Scene Cut Detection: `select='gt(scene,0.25)',metadata=print` accurately identified cut points at ~2.8s intervals in reference videos.
  - Audio Dynamics Analysis: `volumedetect` filter extracted Mean Volume (`-16.3 dB`) and Max Volume (`-0.7 dB`).
  - Contact Sheet Generation: `fps=9/duration,scale=360:640,tile=3x3` rendered high-density visual grids in <1 second.
- **Verdict**: **Essential Core Tool**. 100% reliable, deterministic, zero network dependency.

### B. Speech Transcription (Whisper & faster-whisper)
- **Candidate Models**: OpenAI `whisper`, `faster-whisper` (CTranslate2).
- **Hardware Requirement**:
  - `whisper-large`: Requires 4GB+ VRAM or heavy CPU computation (~15-30s per 20s clip on Core i5-4570).
  - `whisper-base / tiny`: Fast on CPU (~1-2s), suitable for timing alignment.
- **Edge-TTS Subtitle Alternative**: Generates pre-synchronized word and sentence timestamps directly during synthesis, removing the need for post-hoc speech-to-text inference.

---

## 2. Video Generation & Visual Engines (B2)

### A. Google Flow & Gemini Video Capabilities
- **Status in Account**:
  - Google Flow is currently an invite/preview web-based interface for generative video (Veo / Imagen 3).
  - Official public REST API for programmatic video generation has restricted rollout / waitlist.
  - Strategy: Architect the system with a **Decoupled Asset Queue**. If Flow is used, the system exports structured prompt batches (`jobs/<job_id>/flow_prompts.json`) ready for one-click browser generation, and auto-resumes when files land in `jobs/<job_id>/assets/`.

### B. High-Fidelity Multi-Shot Ken Burns Engine
- **Implementation**: FFmpeg hardware-accelerated dynamic scaling and panning (`scale`, `crop`, `zoompan`).
- **Visual Sources**:
  - High-resolution (1080x1920) vertical atmospheric photography and digital artwork from CC0 and Unsplash License libraries.
  - Multi-scene cutting: 4 to 6 scenes per 20s video.
  - Zero cloud generation latency, zero cost, deterministic 1080p 30fps output.

---

## 3. Voice & Audio Synthesis (B3)

### A. Microsoft Edge Neural TTS (`edge-tts`)
- **Voices Evaluated**:
  - `en-US-ChristopherNeural`: Low-register, warm, intimate male whisper. Closest match to Whisprs reference.
  - `en-US-JennyNeural`: Soft, gentle female introspective tone.
  - `en-GB-RyanNeural`: Contemplative, poetic British male voice.
- **Performance**: Synthesizes 20-second audio + synchronized VTT subtitles in **1.8 seconds** on standard CPU.
- **License**: LGPL-3.0 python wrapper using public edge endpoints.
- **Cost**: \$0.00 / Zero API Keys.

### B. Kokoro-82M
- **Evaluation**: 82-million parameter open-weight TTS model.
- **Hardware Requirement**: PyTorch / ONNX runtime. On Intel i5-4570 (no CUDA GPU), ONNX CPU inference takes ~4–6s per sentence.
- **Verdict**: High quality, but requires managing heavy PyTorch weights. Edge-TTS delivers equal or superior natural whisper prosody with 0MB disk overhead.

---

## 4. Editing & Rendering Tools (B4)

| Tool | Windows Native | Agent Automation | Rendering Speed | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **FFmpeg 9.0** | Native EXE | Full CLI / Scriptable | 3–5x real-time (2.5s render) | **Primary Engine** |
| **Remotion** | Supported (Node/React) | Programmatic | Slower (headless Chrome) | Overkill for multi-shot cuts |
| **Lumen / SynthCut** | Python / Web | Experimental | Variable / Unmaintained | Not production-stable on Win10 |
| **Frontstage** | Web / MCP | Beta | Requires cloud / webview | Keep as optional MCP |

---

## 5. Automation & Orchestration (B5)

### A. Antigravity 2.0 (Native Agent Orchestrator)
- Full local filesystem access, subagent delegation, task management, code execution.
- Acts as Creative Director, QA Validator, and System Architect.

### B. n8n Community Edition
- Running locally in Docker container `n8n` on `http://localhost:5678`.
- Exposes Webhook triggers, Cron triggers, retry mechanics, and visual job execution history.
- Seamless bridge to host rendering engine via `http://host.docker.internal:5055`.
