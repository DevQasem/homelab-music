# Optional AI add-on for Homelab Music (needs an NVIDIA graphics card).
# Start it together with the player:  docker compose --profile ai up -d --build
FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# PyTorch with its own CUDA libraries (the host only needs the NVIDIA driver)
RUN pip install --no-cache-dir torch torchaudio \
      --index-url https://download.pytorch.org/whl/cu128
COPY ai/requirements.txt /srv/requirements.txt
RUN pip install --no-cache-dir -r /srv/requirements.txt

# Downloaded models are kept in /data/ai_models so they survive rebuilds.
# Demucs' published weights are an older file format that newer PyTorch
# refuses by default; they come from Meta's own server, so allow them.
ENV DATA_DIR=/data TORCH_HOME=/data/ai_models/torch HF_HOME=/data/ai_models/hf \
    TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD=1 PYTHONUNBUFFERED=1

WORKDIR /srv
COPY ai/server.py .
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
