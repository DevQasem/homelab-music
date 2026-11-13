"""Homelab Music - AI add-on.

A small service the player calls for the two jobs that need a graphics card:

  /separate  split a song into vocals and instrumental (Demucs)
  /generate  make a short piece of music from a text description (MusicGen)

Only one model is kept in memory at a time, so it fits a 6 GB card. Files are
exchanged through the /data folder that both containers mount."""
import gc
import os
import subprocess
import threading
import wave

import numpy as np
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Homelab Music AI")
DEV = "cuda" if torch.cuda.is_available() else "cpu"
MUSICGEN = os.environ.get("MUSICGEN_MODEL", "facebook/musicgen-small")
DATA = os.path.realpath(os.environ.get("DATA_DIR", "/data"))
_lock = threading.Lock()          # one job at a time
_loaded = {"name": None, "obj": None}


def use(name: str, loader):
    """Return the named model, unloading whichever other one was in memory."""
    if _loaded["name"] != name:
        _loaded.update(name=None, obj=None)
        gc.collect()
        if DEV == "cuda":
            torch.cuda.empty_cache()
        _loaded.update(name=name, obj=loader())
    return _loaded["obj"]


def inside_data(path: str) -> str:
    real = os.path.realpath(path)
    if not real.startswith(DATA + os.sep):
        raise HTTPException(400, "Path is outside the data folder")
    return real


def read_audio(path: str, rate: int, channels: int) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vn", "-f", "f32le",
         "-ac", str(channels), "-ar", str(rate), "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).T.copy()


def write_wav(path: str, audio: np.ndarray, rate: int):
    """audio: (channels, samples) floats in -1..1"""
    peak = float(np.abs(audio).max()) or 1.0
    if peak > 1:
        audio = audio / peak
    pcm = (audio.T * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(audio.shape[0])
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())


def vram_peak() -> int:
    return int(torch.cuda.max_memory_allocated() / 2**20) if DEV == "cuda" else 0


@app.get("/health")
def health():
    info = {"ok": True, "device": DEV, "model": MUSICGEN}
    if DEV == "cuda":
        info["gpu"] = torch.cuda.get_device_name(0)
        info["vram_mb"] = int(torch.cuda.get_device_properties(0).total_memory
                              / 2**20)
    return info


class SplitReq(BaseModel):
    src: str       # audio file inside /data
    out_dir: str   # folder inside /data for vocals.wav and instrumental.wav


@app.post("/separate")
def separate(req: SplitReq):
    src, out_dir = inside_data(req.src), inside_data(req.out_dir)
    os.makedirs(out_dir, exist_ok=True)
    with _lock:
        from demucs.apply import apply_model
        from demucs.pretrained import get_model
        if DEV == "cuda":
            torch.cuda.reset_peak_memory_stats()
        model = use("demucs", lambda: get_model("htdemucs").to(DEV).eval())
        wav = torch.from_numpy(read_audio(src, model.samplerate, 2))
        ref = wav.mean(0)
        mean, std = ref.mean(), ref.std() + 1e-8
        with torch.no_grad():
            # split=True works through the song in chunks, keeping memory low
            out = apply_model(model, ((wav - mean) / std)[None], device=DEV,
                              split=True, overlap=0.25, progress=False)[0]
        out = out * std + mean
        names = list(model.sources)
        vocals = out[names.index("vocals")]
        rest = sum(out[i] for i, n in enumerate(names) if n != "vocals")
        paths = {"vocals": os.path.join(out_dir, "vocals.wav"),
                 "instrumental": os.path.join(out_dir, "instrumental.wav")}
        write_wav(paths["vocals"], vocals.numpy(), model.samplerate)
        write_wav(paths["instrumental"], rest.numpy(), model.samplerate)
        return {**paths, "peak_vram_mb": vram_peak()}


class GenReq(BaseModel):
    prompt: str
    seconds: int = 20
    out: str       # .wav path inside /data


@app.post("/generate")
def generate(req: GenReq):
    out = inside_data(req.out)
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(400, "Describe the music first")
    seconds = max(5, min(30, req.seconds))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with _lock:
        from transformers import AutoProcessor, MusicgenForConditionalGeneration
        if DEV == "cuda":
            torch.cuda.reset_peak_memory_stats()

        def load():
            return (AutoProcessor.from_pretrained(MUSICGEN),
                    MusicgenForConditionalGeneration.from_pretrained(MUSICGEN)
                    .to(DEV).eval())

        proc, model = use("musicgen", load)
        inputs = proc(text=[prompt], padding=True, return_tensors="pt").to(DEV)
        with torch.no_grad():
            audio = model.generate(**inputs, do_sample=True, guidance_scale=3.0,
                                   max_new_tokens=int(seconds * 50))
        rate = model.config.audio_encoder.sampling_rate
        write_wav(out, audio[0].float().cpu().numpy(), rate)
        return {"out": out, "seconds": seconds, "peak_vram_mb": vram_peak()}
