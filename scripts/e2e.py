"""Real HTTP CPU integration. Uses isolated DATABASE_PATH; never run against personal data."""

import httpx, json, io, wave, time, threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

base = "http://localhost:3000"
c = httpx.Client(base_url=base, headers={"Origin": base}, timeout=180)
for _ in range(60):
    try:
        if c.get("/api/health").status_code == 200:
            break
    except httpx.ConnectError:
        pass
    time.sleep(1)
else:
    raise AssertionError("App not ready within 60 seconds")


def silence(seconds):
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\0" * (16000 * 2 * seconds))
    return out.getvalue()


assert (
    c.post(
        "/api/session",
        json={"mode": "review"},
        headers={"Origin": "https://evil.example"},
    ).status_code
    == 403
)
q = c.post("/api/session", json={"mode": "review"}).json()
assert len(q) <= 25 and not any("german" in x for x in q)
t = q[0]["ticket"]
assert c.post("/api/reference", json={"ticket": t}).status_code == 409
assert c.post("/api/review", json={"ticket": t, "grade": 3}).status_code == 409
assert (
    c.post(
        "/api/assess",
        data={"ticket": t},
        files={"file": ("empty.webm", b"", "audio/webm")},
    ).status_code
    == 422
)
assert (
    c.post(
        "/api/assess",
        data={"ticket": t},
        files={"file": ("bad.webm", b"bad" * 300, "audio/webm")},
    ).status_code
    == 422
)
assert (
    c.post(
        "/api/assess",
        data={"ticket": t},
        files={
            "file": (
                "silence.wav",
                silence(2),
                "audio/wav",
            )
        },
    ).status_code
    == 422
)
assert (
    c.post(
        "/api/assess",
        data={"ticket": t},
        files={"file": ("long.wav", silence(31), "audio/wav")},
    ).status_code
    == 422
)
assert (
    c.post(
        "/api/assess",
        data={"ticket": t},
        files={"file": ("large.wav", b"0" * (8 * 1024 * 1024 + 1), "audio/wav")},
    ).status_code
    == 413
)
card = c.post("/api/reveal", json={"ticket": t}).json()
ref = c.post("/api/reference", json={"ticket": t})
assert ref.status_code == 200 and ref.content[:4] == b"RIFF"
Path(".cache/ui-reference.wav").write_bytes(ref.content)
r = c.post(
    "/api/assess",
    data={"ticket": t},
    files={"file": ("reference.wav", ref.content, "audio/wav")},
)
assert r.status_code == 200, r.text
a = r.json()
assert isinstance(a["feedback"]["score"], (int, float)) and a["feedback"]["transcribe"]
barrier = threading.Barrier(2)


def concurrent_assessment():
    barrier.wait()
    return c.post(
        "/api/assess",
        data={"ticket": t},
        files={"file": ("reference.wav", ref.content, "audio/wav")},
    ).status_code


with ThreadPoolExecutor(max_workers=2) as executor:
    jobs = [executor.submit(concurrent_assessment) for _ in range(2)]
    assert sorted(j.result() for j in jobs) == [200, 429]
retry = c.post(
    "/api/assess", data={"ticket": t, "attempt": a["id"], "target": card["german"]}
)
assert retry.status_code == 200, retry.text
assert c.post("/api/review", json={"ticket": t, "grade": 1}).status_code == 200
assert c.post("/api/review", json={"ticket": t, "grade": 4}).status_code == 409
before = c.get("/api/export").json()
bad = dict(before, version=999)
assert (
    c.post("/api/import", json={"confirm": "REPLACE", "backup": bad}).status_code == 400
)
assert c.get("/api/export").json()["cards"] == before["cards"]
assert (
    c.post("/api/import", json={"confirm": "REPLACE", "backup": before}).status_code
    == 200
)
assert c.get("/api/export").json()["attempts"] == before["attempts"]
Path(".cache/e2e-results.json").write_text(
    json.dumps(
        {
            "status": "pass",
            "referenceBytes": len(ref.content),
            "syntheticTarget": card["german"],
            "score": a["feedback"]["score"],
            "transcript": a["feedback"]["transcribe"],
            "checks": [
                "origin rejection",
                "hidden session target",
                "reference gate",
                "grade gate",
                "empty invalid silence audio",
                "real assessment",
                "duration and size limits",
                "bounded concurrent inference",
                "alternative recheck",
                "double grading",
                "atomic invalid import",
                "backup roundtrip",
            ],
        },
        indent=2,
    )
)
print(Path(".cache/e2e-results.json").read_text())
