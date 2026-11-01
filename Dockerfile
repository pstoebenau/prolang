# Linux NVIDIA target: CUDA 12.8 includes Blackwell support. Target execution unverified.
FROM nvidia/cuda:12.8.1-cudnn-runtime-ubuntu24.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PATH=/app/.venv/bin:/usr/local/bin:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv python3-dev build-essential git curl ca-certificates unzip ffmpeg espeak-ng libsndfile1 tini && rm -rf /var/lib/apt/lists/*
COPY --from=oven/bun:1.4.3 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/inference/package.json apps/inference/package.json
RUN bun install --frozen-lockfile
COPY apps/inference/requirements-linux.lock apps/inference/requirements-linux.lock
RUN python3 -m venv /app/.venv && pip install --no-cache-dir torch==2.10.0 --index-url https://download.pytorch.org/whl/cu128 && pip install --no-cache-dir -r apps/inference/requirements-linux.lock && pip install --no-cache-dir --no-deps 'openpronounce @ git+https://github.com/Halleck45/OpenPronounce.git@74bc17ea406e6f057f15eea0e70951e1931af868'
COPY . .
RUN bun run build && useradd --uid 10001 --create-home prolang && mkdir -p /app/data /app/.cache/huggingface /app/.cache/references && chown -R prolang:prolang /app
USER prolang
ENV NODE_ENV=production PORT=3000 DATABASE_PATH=/app/data/prolang.sqlite HF_HOME=/app/.cache/huggingface OPENPRONOUNCE_CACHE_DIR=/app/.cache/references OPENPRONOUNCE_DEVICE=cpu BODY_SIZE_LIMIT=26214400
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini","-g","--"]
CMD ["bun","run","start"]
