# Agent Roles & Operational Protocols in Google Antigravity 2.0

This specification establishes how specialized autonomous agents collaborate within Antigravity 2.0 to maintain, operate, and scale the Whisprs Video Studio.

---

## 1. Central Orchestrator: Antigravity 2.0 Lead Agent
- **Responsibilities**:
  - Creative direction and story validation.
  - Dispatching subagent tasks and reviewing conclusions before integration.
  - Enforcing documentation integrity and quality gates.
  - Direct execution of sensitive code modifications.

---

## 2. Specialized Subagent Division of Labor

### A. Reference Video Analyst (`role: Reference Analyst`)
- **Mission**: Ingest new reference URLs or local recordings; execute `ffprobe`, scene cut detection, audio volume profiling, and contact-sheet generation.
- **Tools**: Read-only tools, `run_command` (FFmpeg/Playwright).
- **Deliverables**: Updated `VIDEO_INVENTORY.md` and forensic reports.

### B. Tool Researcher & Benchmark Agent (`role: Tool Researcher`)
- **Mission**: Monitor open-source TTS models (e.g., Kokoro updates), video synthesis engines, and license changes.
- **Tools**: Web search, GitHub repository audits, documentation verification.
- **Deliverables**: Updates to `research/TOOL_RESEARCH.md` and `LICENSE_AND_COST_AUDIT.md`.

### C. Video Production & Render Agent (`role: Production Engineer`)
- **Mission**: Execute script synthesis, voice generation, ASS subtitle formatting, and FFmpeg multi-scene compositing.
- **Continuous Cadence & Script Protocol**: Strictly enforce `config/SPEECH_CADENCE_GUIDELINES.md` (`C:\Users\majji\OneDrive\Desktop\Nouveau document texte (2).txt`). Scripts must be lowercase only, 40-50 words, zero hard punctuation (no `.`, `!`, `?`), with mid-clause breaks using `-` or `...` to ensure continuous pitch suspension and prevent unnatural full stops.
- **Deliverables**: Finished 1080x1920 MP4 video files in `output/` and job records in `jobs/`.

### D. QA & Compliance Inspector (`role: QA Inspector`)
- **Mission**: Inspect rendered MP4 streams, detect black frames, verify audio peak/mean loudness, check mobile-safe subtitle margins, and generate reports.
- **Deliverables**: Verification records in `reports/`.

---

## 3. Communication & Execution Rules
1. **Evidence First**: Agents must ground creative conclusions in direct forensic data (ffprobe logs, contact sheets) rather than generic assumptions.
2. **Deterministic Processing**: Heavy video processing is offloaded to local native binaries (`ffmpeg`, `edge-tts`) rather than nondeterministic API loops.
3. **Fail-Safe Orchestration**: If n8n or an external webhook is unavailable, the pipeline falls back seamlessly to Antigravity CLI execution without stalling.
4. **Strict No-Watermark / No-Logo Policy**: NEVER add the `@Whisprs` logo, watermark, or signature to any video overlay, ASS subtitle track, thumbnail, or image. All visual generation prompts and composited video renders must remain 100% free of logos, watermarks, and branding.
