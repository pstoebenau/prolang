# Application validation — 2026-11-01

Current authorization: the user explicitly approved CPU continuation and one Compose service containing SvelteKit plus private FastAPI. CUDA was waived as a prerequisite, not validated. No deployment was performed. Historical `validation/results/` is unchanged; app QA artifacts are separately under ignored `.cache/`.

Test host: Apple M3 Max arm64 macOS, Bun 1.4.3, existing Python 3.11.17 environment and pinned model caches. All actual inference used CPU. Source/package/model pins are in the lockfiles; Linux packages/container/CUDA remain unexecuted.

## Executed checks

- `bun test tests`: 6 tests, 35 assertions. Migration idempotence/100-card seed, pronunciation-only scheduling separation, reveal gate, atomic review/log writes, stale/double-review rejection, recall independent of score, Again due interval, backup date/parameter/history/alternative roundtrip, duplicate/malformed/date/parameter/log import rejection without data loss.
- `bun run check`: zero errors, zero warnings.
- `bun run build`: successful SvelteKit/adapter-bun production build. Nonfatal tooling warnings: Turbo's Bun transitive-lock graph warning and adapter bundler treating `bun:sqlite` as an external. The built app was actually launched with Bun and SQLite worked. Rollup also removes a misplaced generated pure annotation.
- `scripts/e2e.py`: actual production HTTP server, disposable `.cache/test.sqlite`, actual model inference and gTTS reference WAV. Origin rejection, bounded hidden-answer session, pre-reveal reference/grade rejection, empty/corrupt/silent/overlong/oversize audio errors, bounded overlapping-inference rejection, actual synthetic-reference assessment, saved-target recheck, double-grade rejection, invalid import atomicity and valid restore. Reference sent through multipart to the wrapper, not mocked. Numeric scores establish execution only, not accuracy.
- `scripts/ui_smoke.py`: headless Chrome for Testing 156; desktop 1440×1000 and mobile viewport 390×844. Fake microphone fed a gTTS synthetic WAV, real MediaRecorder and HTTP inference. Hidden answer, feedback, reference playback, self-grading, hidden next prompt, search and focused retry separation. Mobile viewport layout inspected via screenshots; no horizontal overflow. Mobile reveal/self-grade and simulated permission-denial recovery also pass. No physical microphone or Android device was used.
- Both CPU and GPU-overlay Compose configurations parse with `docker compose ... config --quiet`. No Docker image build, container execution, CUDA kernel or deployment was performed.

The built app was tested, rather than Vite's preview command. Screenshots were inspected locally using image tools; no preview tools were used.

## Limits

German pronunciation scores/phone feedback remain experimental: English-derived uncalibrated thresholds, recognition false positives, and normalized vowel-duration loss. No learner benchmark or expert German ratings. References require internet on uncached requests and Google output/terms are not immutable. Deck translation alternatives are user accepted, not semantically verified by a model.

Physical microphone permission/device/noise/clipping behavior, Android Chrome capture and HTTPS deployment, Linux fresh install, container runtime/lifecycle under Docker, RTX 5060 Ti sm_120/VRAM/kernel/latency, and GPU peak/concurrent load are deferred. Single-user app has no authentication; use trusted local access or a protected proxy.

All 100 canonical deck references were also generated through the running reference endpoint and cached successfully (`bun scripts/warm-audio.ts`, `.cache/warm-audio.log`). This does not redistribute audio or validate its license/voice quality. Cache preparation leaves scheduling untouched.

Local supervisor lifecycle was exercised by sending SIGTERM to the uvicorn child: the supervisor exited, and both 3000 and 8001 listeners closed. This is local process evidence, not container lifecycle evidence. A 512 KB adapter default discovered by the oversized upload test was corrected to 25 MB in the launcher; per-audio validation still enforces 8 MB.

## Parent code review and final verification

The parent independently reviewed the TypeScript store/API, recording lifecycle, Python worker and one-service packaging. Fixed stale asynchronous UI updates: cancelled microphone permission requests now release only their own streams, old recording callbacks cannot affect a newer session, and delayed API/reveal responses cannot inject answers after navigation. Editing an alternative no longer relabels feedback that was calculated against the previous target. Selecting an invalid backup also clears any previously selected replacement.

Added `scripts/ui_races.py`: deterministic mocked media/HTTP browser regressions for those cancellation/navigation races (separate from real model validation). It waits for client initialization before interacting. Passed twice after that initialization fix. Desktop/mobile screenshots were inspected; no horizontal overflow.

After these changes, the parent reran TypeScript checking (zero errors/warnings), production build, the 6 store tests / 35 assertions, real CPU HTTP E2E, and desktop/mobile-viewport practice smoke using a separate `.cache/parent-review.sqlite` database. All passed. The production test server was stopped afterward; local development at port 5173 remains available. No user progress was changed by the parent review tests. CUDA, physical microphone/Android hardware, and container execution remain unverified.

## Paragraph reading and independent skill stages (2026-11-01)

- Type/Svelte checks passed with zero errors and warnings; production build passed (existing nonfatal bundler warnings remain).
- 39 Bun tests passed, including independent progression, distinct-passage advancement, vocabulary scoring, single-use submissions, legacy backup compatibility, audio exclusion, and invalid-import preservation.
- 10 Python tests passed, including bounded feature windows, exact 120-second reading acceptance, 121-second rejection, and unchanged 30-second flashcard enforcement. Duration tests use generated WAVs and mocked scoring; they exercise the real FFmpeg decoder.
- All 15 browser regression tests passed; the additional narrow-screen reading test and all three reading-flow tests then passed together. Tests use an isolated in-memory database and mocked media/model responses. Coverage includes microphone release after cancellation/navigation and late permission grants, completed vocabulary placement, persisted results, and origin checks. Desktop and 390px mobile screenshots were inspected; no horizontal overflow.
- Real isolated CPU model runs used synthetic German reference audio: a 40.632-second, 102-word passage returned 370 phone spans; a 116.137-second, 306-word recording returned 1,114 phone spans. End-to-end isolated runs including model initialization took approximately 45 and 94 seconds. Both returned complete text and pronunciation feedback. These runs exercised synthesis, decoding, long-window feature extraction, Qwen transcription, scoring, and timing without touching user progress. Synthetic examples prove execution, not human pronunciation accuracy.
- Reading stages and vocabulary stages are uncalibrated practice estimates. The vocabulary assessment bank has 64 entries, four bands, and separate recognition/typed-recall results; it is not a validated vocabulary-size instrument. No physical microphone, German learner benchmark, GPU, or container validation was added.
