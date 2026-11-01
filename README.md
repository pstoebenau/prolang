# Prolang

Local, single-user German vocabulary and pronunciation practice. SvelteKit + TypeScript on Bun, a Turborepo workspace, SQLite, ts-fsrs 5.2.3, and a private FastAPI/OpenPronounce model process. **CPU continuation is user approved. CUDA and container execution remain unverified. Nothing has been deployed.**

## Start on this Mac

The existing `.venv` and model caches are usable:

```sh
bun install --frozen-lockfile
bun run dev
# http://localhost:5173
```

One command starts both workspace apps through `turbo dev --env-mode=loose`. `@prolang/web` runs Vite; `@prolang/inference` runs the Python app in `apps/inference` using the root `.venv/bin/python` (or the `PYTHON` override). Both dev tasks are persistent and uncached. Task launchers supervise dedicated process groups, so even model workers left behind by an exited server are terminated. Inference deliberately does not watch/reload files: restart dev after Python edits to avoid repeatedly loading the large models. Runtime environment variables (including model/cache settings, `DATABASE_PATH` and `ORIGIN`) pass through to both apps. Model startup can take a while; `/api/health` returns 503 until all checkpoints are loaded. FastAPI listens only on `127.0.0.1:8001`. Ctrl-C terminates both apps and their workers. If either process fails, the other is terminated too.

Production uses the root fail-fast process-group supervisor to run both workspace `start` scripts. Production build, also local:

```sh
bun run build
ORIGIN=http://localhost:3000 bun run start
# http://localhost:3000
```

Use the exact configured origin, including scheme and port. Bun loads `.env`; copy `.env.example` for production settings. Data defaults to `data/prolang.sqlite` when launched through these commands. `DATABASE_PATH` overrides it.

## Fresh setup

Install Bun **1.4.3**, `uv`, FFmpeg and espeak-ng (`brew install ffmpeg espeak-ng` on Mac). Then `bun run bootstrap`. This creates Python 3.11.17, installs the tested macOS lock and the immutable OpenPronounce Git commit as a package, and installs the JS lock. It does not require a source checkout in `.cache/OpenPronounce`, regenerate validation evidence, or download human datasets. Startup downloads the pinned OpenPronounce snapshots from `validation/models.lock.json` and Qwen3-ASR from `apps/inference/models.lock.json` (the old German ASR checkpoint is skipped) on first use. Allow several GB of disk and RAM and outbound Hugging Face/GitHub access. With models already cached, `HF_HUB_OFFLINE=1` avoids Hub requests; gTTS references still need internet on cache misses.

Linux CPU bootstrap uses a separate dependency lock and torch 2.10.0 CPU; **Linux setup has not been executed here**. The Mac environment remains the validated platform. Existing validation reproduction is separate: [docs/REPRODUCE.md](docs/REPRODUCE.md).

## Practice

Each bounded session selects up to 20 due and 5 new entries. Recall from English → record German → reveal → compare experimental feedback → play synthetic reference → retry → self-grade memory. Explicit reveal permits a review without recording. The expected German is excluded from session responses and stays hidden in the practice workspace until recording succeeds or reveal is selected. The Deck is intentionally a browsable answer list.

Again follows FSRS learning/relearning steps (normally one minute); start another session when due. A session is finite. A separate Deck/Progress pronunciation retry cannot schedule vocabulary. A low pronunciation score never changes the self-selected recall grade. Tickets prevent stale and duplicate scheduling, including across tabs. Scheduling and its history insert share one SQLite transaction.

After an assessment, expand “Accept different wording” to edit the target and recheck the stored recording. Accepted targets are saved and can be selected on future assessments. Semantic equivalence is your decision; the app does not validate translation correctness. Attempts store target, feedback and timestamp independently of review history.

## Audio, provenance and privacy

The 100 original entries span family, daily activities, food, shopping and travel (20 each), with English meanings, bilingual examples, noun articles and plural/usage notes. Deck text is dedicated to [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). See [provenance](docs/PROVENANCE.md).

Reference audio is **synthetic Google Translate German via gTTS 2.5.4**, generated on demand and cached. It is not human speech. Uncached target text goes to Google. gTTS software is MIT; no independent license to redistribute Google's audio is claimed. Google service terms apply. Network/service failure produces a retryable error. The Settings screen discloses this.

Recordings and feedback stay in your local database. Uploads are at most 8 MB and 30 seconds, decoded with a bounded FFmpeg invocation in a serialized model worker. Silence/empty/undecodable input yields actionable errors. Temporary uploads are removed. The worker rejects overlapping inference rather than building an unbounded queue; HTTP and inference deadlines are explicit. Timeout kills the service so the supervisor stops its whole process group.

Microphones need HTTPS or localhost. Use current Chrome. Hardware microphones, Android Chrome hardware, denied-device variations, and German coaching accuracy require further validation. Scores are experimental, English-derived thresholds are uncalibrated for German, and vowel duration is a known blind spot.

This is a **single-user app without authentication**. Keep it local or behind trusted access control. Mutation requests require the configured same origin. Do not expose FastAPI or put secrets in public app URLs. Treat DB/exports/audio caches as personal data.

## Backup and restore

Settings exports strict version-1 JSON: FSRS dates and parameters, all card states, alternatives, reviews and attempt feedback. Audio is explicitly excluded. Restore validates everything before one replacement transaction; malformed input leaves the DB and live tickets intact. The UI requires an explicit replacement action and invalidates old tickets on success. Existing recording blobs are removed on restore; reference audio can be generated again. Export before replacement.

For a complete backup including recordings, stop the app and copy the **whole `data/` directory**; also copy `.cache/references/` if wanted. Do not copy a live SQLite file alone (WAL may contain writes). Model caches can be downloaded again. Restore directory backups only while stopped. Container volumes follow the same stop/copy rule (`docker compose stop`, archive the named volumes, restart).

## Web architecture

The web app uses SvelteKit routes for practice (`/`), the deck (`/deck`), progress (`/progress`), and settings (`/settings`). Page server loaders read only the data each screen needs; practice mutations invalidate `prolang:data`. Navigation uses links, so URLs, reloads, and browser history work normally. Backup restore is a progressively enhanced form action with explicit confirmation and server-side validation.

`src/lib/components/practice` contains the session view, pronunciation feedback, and help. `src/lib/practice/session.svelte.ts` creates per-component reactive session state and owns recording, cancellation, playback, and teardown. Do not move that state into module-level singletons. Shared domain types live in `src/lib/types.ts`; SQLite access and inference transport stay under `src/lib/server`. Each API operation has its own `+server.ts`, sharing origin checks, upload limits, and error handling.

Selected words offer **Native** (synthetic reference speech) and **Yours** (the recorded word segment). Playback uses the existing phone recognizer’s frame timings aligned to reference words; word boundaries are approximate. Audio controls stay hidden. Older attempts without timestamps require a new recording or recheck before word playback is available.

The Playwright suite covers server rendering without JavaScript, backup validation, navigation, review refresh, retry deep links, API boundaries, and microphone cleanup. It uses an isolated in-memory database and does not run the speech models.

## Checks

```sh
bun test tests # includes fail-fast process-group cleanup regressions
bun run check # Turbo runs web type checks and inference Python compilation (uncached)
bun run build
bunx playwright install chromium # once, for web regression tests
bun run --cwd apps/web test:e2e # production build, isolated in-memory database
# In a second shell, using disposable data:
DATABASE_PATH="$PWD/.cache/test.sqlite" ORIGIN=http://localhost:3000 bun run start
.venv/bin/python scripts/e2e.py
.venv/bin/python scripts/ui_smoke.py
```

The HTTP test mutates progress: use the disposable database. UI smoke uses the Chrome for Testing already downloaded during validation and a gTTS WAV fake microphone; it exercises real MediaRecorder/model requests. Run HTTP E2E first to create `.cache/ui-reference.wav`. For another machine, install Playwright/Chrome and adjust its executable path in the smoke script. Screenshots under `.cache/` are internal QA, not hardware evidence. See [application validation](docs/APP-VALIDATION.md) for actual results.

## Container readiness (not executed)

`Dockerfile` targets Linux NVIDIA CUDA 12.8.1 with the official torch 2.10.0 cu128 wheel, **not upstream cu124** ([official installation matrix](https://docs.pytorch.org/get-started/previous-versions/)). `compose.yaml` contains exactly one service: Bun supervises SvelteKit and loopback FastAPI; only port 3000 is published. DB, pinned model cache and reference cache use persistent named volumes. It runs as an unprivileged user under tini. Health checks allow a long first model download.

CPU mode: `docker compose up --build`. Opt-in NVIDIA reservation: `docker compose -f compose.yaml -f compose.gpu.yaml up --build`. Neither command was executed here. For RTX 5060 Ti, validate driver/toolkit, sm_120 kernels, VRAM, model inference and peak load on the target before use; see [CUDA follow-up](docs/CUDA.md). Python transitive Linux pins are provided but are not a verified Linux lock environment.

For Dokploy HTTPS, set `ORIGIN=https://your-host` exactly, route the trusted reverse proxy to port 3000, terminate TLS, allow at least 25 MB requests and 180-second response timeouts, and keep port 8001 private. Do not trust arbitrary forwarded origin headers. Configure access control at the proxy. No deployment has been performed.

To pre-generate all 100 canonical references while the local production server is ready, run `bun scripts/warm-audio.ts` (internet required). It creates pronunciation-only tickets and cached references without scheduling reviews. This command was executed successfully on the Mac. JSON import has a 24 MB UI limit and 100,000 records per history collection; use the stopped-directory backup for larger histories or to retain recordings.

Recording cancellation/navigation regressions can also be checked against the development server with `.venv/bin/python scripts/ui_races.py`. This uses mocked session/media responses, never grades personal cards, and is separate from the real-model tests above.

## German transcription

Runtime transcription uses Qwen3-ASR 1.7B (Apache-2.0), pinned in `apps/inference/models.lock.json`. It receives only the audio and German language setting, never the expected answer or deck vocabulary. The former deck-based orthography adapter is no longer installed. OpenPronounce still provides independent phoneme recognition and acoustic feedback. Historical validation results predate this change.

Run `uv pip install --python .venv/bin/python -r apps/inference/requirements-macos.lock` on Mac, then restart `bun run dev`. Qwen downloads roughly 4.4 GB of weights on first startup and uses additional runtime memory. CPU is the default; `QWEN_ASR_DEVICE=cuda:0` selects an NVIDIA device. GPU and container execution remain unverified. The Mac runtime lock is separate from the historical validation lock; the Linux runtime lock includes Qwen dependencies.
