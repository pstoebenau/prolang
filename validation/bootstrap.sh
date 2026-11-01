#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .cache validation/results
commit=74bc17ea406e6f057f15eea0e70951e1931af868
if [ ! -d .cache/OpenPronounce/.git ]; then git clone https://github.com/Halleck45/OpenPronounce.git .cache/OpenPronounce; fi
git -C .cache/OpenPronounce checkout --detach "$commit"
# macOS prerequisite: brew install ffmpeg espeak-ng (tested 9.0.2 / 1.52.0).
# Linux prerequisite: apt-get install ffmpeg espeak-ng libsndfile1
uv venv --python 3.11.17 .venv
uv pip install --python .venv/bin/python -r validation/requirements-macos-arm64.lock
# lock excludes the machine-specific editable path.
uv pip install --python .venv/bin/python --no-deps -e '.cache/OpenPronounce[app,dev]'
.venv/bin/python validation/download.py
.venv/bin/python validation/prepare_audio.py
.venv/bin/python validation/record_chrome.py
.venv/bin/python validation/ingest.py
.venv/bin/python validation/language_probe.py
.venv/bin/python validation/run.py > validation/results/run.log 2>&1

.venv/bin/python validation/summarize.py
.venv/bin/python validation/check_results.py
