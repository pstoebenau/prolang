#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Install bun, uv, ffmpeg and espeak-ng first. Does not rerun/overwrite evidence.
uv venv --python 3.11.17 .venv
if [ "$(uname)" = Darwin ]; then
 uv pip install --python .venv/bin/python -r apps/inference/requirements-macos.lock
else
 uv pip install --python .venv/bin/python torch==2.10.0 --index-url https://download.pytorch.org/whl/cpu
 uv pip install --python .venv/bin/python -r apps/inference/requirements-linux.lock
fi
uv pip install --python .venv/bin/python --no-deps 'openpronounce @ git+https://github.com/Halleck45/OpenPronounce.git@74bc17ea406e6f057f15eea0e70951e1931af868'
bun install --frozen-lockfile
