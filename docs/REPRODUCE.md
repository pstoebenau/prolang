# Reproduce the CPU validation

This document reproduces the historical prerequisite validation. The current app is documented in ../README.md; CPU continuation is user approved and raw validation evidence is retained. Work from the repository root. Python **3.11.17**, an isolated `.venv`, macOS arm64. Package versions in `validation/requirements-macos-arm64.lock`; system tools tested: FFmpeg 9.0.2 and espeak-ng 1.52.0. `uv` installs Python 3.11 when needed. System default Python 3.15 was intentionally not used.

```sh
brew install ffmpeg espeak-ng
bash validation/bootstrap.sh
```

The bootstrap checks out the exact upstream commit, installs pinned Python packages into a local virtual environment, downloads pinned model snapshots and the licensed human shard, generates source audio, records one actual Chrome MediaRecorder sample, and calls the unmodified FastAPI `/pronunciation` endpoint through `TestClient`. This is a real multipart request/decoder/model/feedback path in-process; it excludes network serving latency and does not deploy anything. Keep the Mac awake. First downloads require several GB and outbound access to GitHub/Hugging Face/Google. gTTS also needs network for each uncached sentence.

Individual commands used (logs preserved in `.cache`, selected evidence copied under results):

```sh
git clone https://github.com/Halleck45/OpenPronounce.git .cache/OpenPronounce
git -C .cache/OpenPronounce checkout --detach 74bc17ea406e6f057f15eea0e70951e1931af868
uv venv --python 3.11.17 .venv
uv pip install --python .venv/bin/python -e '.cache/OpenPronounce[app,dev]'
uv pip install --python .venv/bin/python pyarrow playwright
.venv/bin/python validation/probe.py  # initial discovery/load timings; regenerates pins from current Hub HEAD
.venv/bin/python validation/prepare_audio.py
.venv/bin/python validation/record_chrome.py
.venv/bin/python validation/ingest.py
.venv/bin/python validation/language_probe.py
OPENPRONOUNCE_DEVICE=cpu .venv/bin/python -m pytest .cache/OpenPronounce/tests -q
.venv/bin/python validation/run.py > validation/results/run.log 2>&1
```

For exact revision reproduction use `download.py`, **not** `probe.py`: the latter is retained as the initial discovery evidence generator. The run harness redirects model loading to pinned local snapshots using Python loader wrappers, without changing upstream source. It fixes torch CPU thread count at four. Timing includes decoding, model loading if first use, gTTS if cache miss, acoustic DTW and prosody. First family reference was prewarmed by the standalone TTS probe; distinguish this from uncached TTS/network latency. No mocks replace inference, reference audio, phones, ASR, acoustic distance, scoring or prosody. Browser recording uses real Chrome but a synthetic WebAudio source, not hardware microphone.

Check `validation/results/runs.json` and individual response JSONs for raw scores, transcripts, expected/heard IPA, confidence, word positions and pitch/energy contours. `ingestion.json` records codec/sample rate, length, finite float samples and decode time. `audio-manifest.json` records input hashes and human source IDs. Synthetic source waveform generation and network TTS voice updates mean this is procedural reproducibility with pinned software/models/dataset, not a bit-identical audio promise.

The upstream tests use small fixtures and mocks, and passing them does not establish real recognition quality. The independent real-audio runs establish that separately. Results may be overwritten when rerunning: archive them first. That prerequisite run preceded the application. Current UI and Compose configuration are separate; deployment and GPU execution remain unperformed.
