# OpenPronounce prerequisite validation

**Current gate: user-approved CPU continuation (2026-11-01).** The user explicitly waived CUDA as an implementation prerequisite and confirmed one Compose service containing SvelteKit and an internal FastAPI process. CUDA remains unverified; this is not a GPU pass. See [application validation](APP-VALIDATION.md).

Historical prerequisite findings follow; raw evidence is preserved unchanged. CPU functionality passes this smoke validation; German pronunciation-assessment quality remains unvalidated. No fundamental German model-loading or audio-format blocker was found. A fundamental limitation for comprehensive German phone coaching is loss of vowel-duration information in normalization; German scoring thresholds also lack human calibration.

Validated 2026-11-01 on arm64 macOS, Apple M3 Max, 48 GiB RAM, Python 3.11.17, torch 2.15.0, transformers 5.17.0, four torch CPU threads. All inference explicitly used `cpu`. Source pinned to `74bc17ea406e6f057f15eea0e70951e1931af868`, unchanged. See [reproduction](REPRODUCE.md), [provenance](PROVENANCE.md), [CUDA follow-up](CUDA.md), and raw `validation/results/`.

## Actual execution evidence

- **25/25 everyday German prompts** (five each: family, daily activities, food, shopping, travel), using clearly labeled synthetic Anna recordings, completed the real multipart `/pronunciation` endpoint with HTTP 200 and finite JSON results.
- **15/15 publicly available human read-speech clips** from Thorsten Müller also completed. This is a supplemental single-speaker sample, not human recordings of the 25 exact prompts and not an expert-rated learner benchmark. Actual audio and row IDs were ingested; no model inference was mocked.
- **41/41 WebM/Opus uploads** decoded to finite float32 mono 16 kHz waveforms. Forty were FFmpeg encodes; one was actual **Chrome for Testing 156.0.8078.80 MediaRecorder** output (`audio/webm;codecs=opus`, eight chunks), recorded from a synthetic WebAudio stream. Its score was 87.61, German transcript exact, WER 0.0. This validates real browser-produced bytes, without validating a physical microphone or mobile browser.
- **44/44 analysis responses** include score, language, transcript, acoustic distance, expected/heard phones and confidences, word-level error structure, and F0/energy. Forty corpus requests, one Chrome request, two negative controls, one warm repeat. `validation/results/validation-checks.txt` confirms evidence completeness and negative-control ordering.
- German word CTC, multilingual phone CTC, and English acoustic-embedding checkpoints **all actually loaded and ran**. Model revisions are pinned in `validation/models.lock.json`. Initial download-plus-load measurements were 51.80 s (English), 55.02 s (German), 183.57 s (phones), not inference latencies. German needs **three** large checkpoints; README's general “two checkpoints” description understates this configuration.
- The existing upstream suite passed: **99 tests in 12.64 s** (`upstream-tests.txt`). Those tests alone use mocks and are separate from this actual-model run.

## Feedback and control interpretation

The first synthetic family phrase, “Meine Mutter kocht das Abendessen.”, scored **82.98**, was transcribed exactly, and had phone error rate 0.2083 without flagged words. A cached repeat gave the same score/transcript. Silence returned an empty transcript, no heard phones, all five expected words flagged, PER/WER 1.0, score **10.25**. A recording of “Wo ist der Bahnhof?” assessed against that family phrase returned the correct *spoken* transcript, all five expected words flagged, WER 1.0, PER 0.875, score **19.10**. These are useful whole-sentence negative controls; they do not measure detection of subtle phone errors.

Synthetic prompt scores ranged 76.30–100, median 89.00; median WER 0.0 and median PER 0.20. Six word flags occurred across five synthetic prompts, with per-phone expected/heard/confidence fields. Example `daily-2.json` flags “ich” and “die” despite an exact ASR transcript. Such disagreements require listening and expert review before calling them actual learner errors.

Human scores ranged 75.51–100, median 92.22; median WER 0.0, maximum WER 0.3333, median PER 0.1818. None of the 15 human recordings had flagged words, although phone mismatches remained. This demonstrates usable output and nonzero recognizer error, not validated sensitivity/specificity. Source transcripts are metadata, not independent phonetic ground truth. No human listening/rating was performed. Numerical scores must not be presented as established proficiency grades.

The phone feedback is structurally useful for highlighting words and IPA changes. Generic feedback prose remains English (e.g. “You need to better pronounce these words…”), not German localized teaching advice. Confidence values are model/heuristic quantities, not validated probabilities that a learner made an error.

## Latency scope

On this host the first analysis request took **5.543 s** with model-load/JIT overhead and an already cached reference for that one phrase. The other synthetic requests took 0.749–1.089 s; the synthetic set's nearest-rank p95 including the first request was 1.089 s. The cached same-input repeat took **0.484 s**. Supplemental human requests took 0.750–1.906 s. Independent initial gTTS synthesis of the first family reference took 1.571 s. These are sequential in-process endpoint wall times with short clips, four CPU threads, no HTTP/network serving overhead, and a mix of cached/uncached references. They are **not** deployment SLAs, GPU estimates, concurrency measurements, or calibrated p95 estimates from a large repeated benchmark. Raw durations are in `runs.json` / `runs.csv`; codec durations are in `ingestion.json`.

## German limitations and gate blockers

1. **CUDA unavailable:** no NVIDIA hardware/remote host supplied. CUDA kernel execution, driver/container compatibility, actual RTX 5060 Ti VRAM and latency remain untested. Upstream CUDA 12.4/cu124 image must be replaced with an sm_120-compatible stack before target validation. See CUDA.md.
2. **German score/feedback validation incomplete:** English-calibrated thresholds and weights are reused for German. No German expert-rated learner corpus, minimal-pair error recordings, or false-positive/false-negative evaluation exists here. Public native speech is a smoke check only. Before accepting coaching quality, obtain human recordings of all 25 prompts plus deliberate substitutions/deletions/vowel-duration errors and independent ratings.
3. **Vowel-duration blind spot:** actual `normalize_phone('iː', 'de') == 'i'` (and analogous vowels). Length marks are removed for every language. Some German word pairs retain vowel-quality differences (the actual Stadt/Staat expected phones differ in `a` vs `ɑ`), so do not claim all German minimal pairs collapse. Duration-only mistakes cannot be explicitly diagnosed by this normalized phone channel. Acoustic distance may change, but is not a validated duration detector. See `german-language-probe.json`.
4. **Capture breadth incomplete:** real Chrome encoder ingestion is proven, but hardware microphone, permissions, clipping/background noise, mobile formats and upload limits remain untested. Silence receives HTTP 200 and a low numerical score rather than a dedicated “no speech” response; a future learner flow should distinguish unusable audio before feedback.
5. **Topology resolved by user:** one Compose service containing SvelteKit and private loopback FastAPI. The app and container configuration now exist; deployment remains unexecuted.

## Routine setup and integration findings

Resolved autonomously: installed espeak-ng (including Homebrew's routine pkgconf rebuild), selected isolated Python 3.11 instead of system 3.15, installed pinned packages, downloaded actual model weights, fetched licensed human data, installed an isolated Chrome for Testing binary, exercised WebM decode fallback, and pinned the source/model/dataset revisions. Fresh-environment package installation and all upstream tests succeeded without source patches.

Nonblocking for this CPU smoke test but relevant before service integration: gTTS requires network and its reference voice is not immutable; optional Piper is a possible separately validated offline choice. Model dependencies were unbounded upstream and are now locked for this Mac; GPU needs a separate platform lock. The upstream request helper removes the original upload but leaves converted `.16k.wav` files; no rate limit, file-size/duration guard or no-speech check is implemented there. Its async endpoints execute blocking CPU inference inline, so one successful sequential run proves no concurrency capacity. Correct these ordinary integration concerns after gate review; these were implementation integration requirements, now addressed in the CPU application.

Parent review should verify these raw artifacts and decide acceptance criteria. Current implementation authorization is **CPU continuation approved**. CUDA and German coaching-quality validation remain incomplete.
