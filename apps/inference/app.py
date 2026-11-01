"""Loopback-only model transport. Scheduling, decks and persistence live in TypeScript."""

import os, json, asyncio, tempfile, subprocess, logging
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from concurrent.futures.process import BrokenProcessPool
from contextlib import asynccontextmanager

ROOT = Path(__file__).resolve().parents[2]
os.environ.setdefault("HF_HOME", str(ROOT / ".cache/huggingface"))
os.environ.setdefault("OPENPRONOUNCE_CACHE_DIR", str(ROOT / ".cache/references"))
os.environ.setdefault("OPENPRONOUNCE_DEVICE", "cpu")
os.environ["HF_HUB_DISABLE_XET"] = "1"
from fastapi import FastAPI, Form, File, UploadFile, HTTPException
from fastapi.responses import FileResponse


def initialize():
    import torch
    from functools import lru_cache, partial
    from huggingface_hub import snapshot_download
    from openpronounce import speech, phones
    import gtts
    from apps.inference.qwen_transcription import install, MODEL


    # gTTS's network operations need explicit connect/read timeouts.
    gtts.gTTS = partial(gtts.gTTS, timeout=(5, 20))
    torch.set_num_threads(int(os.getenv("TORCH_THREADS", "4")))
    pins = json.loads((ROOT / "validation/models.lock.json").read_text())
    pins.pop("jonatasgrosman/wav2vec2-large-xlsr-53-german", None)
    pins.update(json.loads((ROOT / "apps/inference/models.lock.json").read_text()))
    paths = {
        name: snapshot_download(
            name,
            revision=rev,
            allow_patterns=["*.json", "*.safetensors", "pytorch_model.bin", "*.txt"],
        )
        for name, rev in pins.items()
    }
    original = speech._load_models

    @lru_cache(None)
    def load(name=speech.MODEL_NAME):
        return original(paths[name])

    speech._load_models = load
    phones.PHONE_MODEL_NAME = paths[phones.PHONE_MODEL_NAME]
    load(speech.MODEL_NAME)
    install(speech, paths[MODEL])
    phones._load_model()
    from apps.inference.phone_timing import install as install_phone_timing
    install_phone_timing(phones)


def ping():
    return True


def execute(kind, text, data):
    from openpronounce import audio, speech
    import numpy as np

    if kind == "reference":
        return audio.text2speech(text, lang="de", backend="gtts")
    with tempfile.TemporaryDirectory(prefix="prolang-") as tmp:
        source = Path(tmp) / "input"
        source.write_bytes(data)
        try:
            r = subprocess.run(
                [
                    "ffmpeg",
                    "-nostdin",
                    "-v",
                    "error",
                    "-protocol_whitelist",
                    "file,pipe",
                    "-format_whitelist",
                    "wav,ogg,matroska,webm,mov,mp3,flac",
                    "-i",
                    str(source),
                    "-t",
                    "31",
                    "-f",
                    "f32le",
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-",
                ],
                capture_output=True,
                timeout=15,
                check=True,
            )
        except (subprocess.SubprocessError, OSError):
            raise ValueError("Cannot decode audio. Try Chrome WebM or a WAV recording.")
        sound = np.frombuffer(r.stdout, dtype=np.float32).copy()
        if len(sound) > 30 * 16000:
            raise ValueError("Recording exceeds 30 seconds. Try a shorter phrase.")
        if (
            len(sound) < 3200
            or not np.isfinite(sound).all()
            or np.sqrt(np.mean(sound**2)) < 0.003
        ):
            raise ValueError(
                "No clear audio detected. Check your microphone, move closer and try again."
            )
        from apps.inference.phone_timing import capture_phone_timing
        with capture_phone_timing() as spans:
            result = speech.compare_audio_with_text(sound, text, lang="de")
        result['differences']['heard_phone_spans'] = spans
        if not result.get("transcribe", "").strip():
            raise ValueError("No speech recognized. Speak clearly and try again.")
        result["transcription_model"] = "Qwen/Qwen3-ASR-1.7B"
        return result


@asynccontextmanager
async def lifespan(app):
    global pool, ready, busy
    ready = False
    busy = False
    pool = ProcessPoolExecutor(max_workers=1, initializer=initialize)
    await asyncio.get_running_loop().run_in_executor(pool, ping)
    ready = True
    yield
    ready = False
    pool.shutdown(wait=False, cancel_futures=True)


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None)
ready = False
busy = False


@app.get("/health")
async def health():
    if not ready:
        raise HTTPException(503, "Models loading")
    return {"status": "ready", "device": os.getenv("OPENPRONOUNCE_DEVICE")}


async def run(kind, text, data=None):
    global busy
    if not ready:
        raise HTTPException(503, "Models are loading. Try again shortly.")
    if busy:
        raise HTTPException(429, "Speech service busy. Try again shortly.")
    if not text.strip() or len(text) > 300:
        raise HTTPException(422, "Target must contain 1–300 characters.")
    busy = True
    future = asyncio.get_running_loop().run_in_executor(pool, execute, kind, text, data)

    def completed(_):
        global busy
        busy = False

    future.add_done_callback(completed)
    try:
        return await asyncio.wait_for(asyncio.shield(future), 150)
    except asyncio.TimeoutError:
        # Killing the service also kills its worker via the process-group supervisor.
        logging.error("Inference deadline exceeded; restarting service required")
        os._exit(1)
    except BrokenProcessPool:
        logging.exception("Inference worker exited")
        os._exit(1)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception:
        logging.exception("Model or synthesis failure")
        raise HTTPException(
            503,
            "Speech processing failed. Uncached references require internet. Try again.",
        )


@app.post("/assess")
async def assess(text: str = Form(...), file: UploadFile = File(...)):
    try:
        data = await file.read(8 * 1024 * 1024 + 1)
        if len(data) > 8 * 1024 * 1024:
            raise HTTPException(413, "Audio exceeds 8 MB.")
        return await run("assess", text, data)
    finally:
        await file.close()


@app.post("/reference")
async def reference(text: str = Form(...)):
    path = await run("reference", text)
    return FileResponse(path, media_type="audio/wav")
